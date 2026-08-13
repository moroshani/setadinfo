from __future__ import annotations

import asyncio

from celery import Celery
import redis
from sqlalchemy import select

from .config import get_settings
from .crud import ingest_task_run, refresh_task_schedule, utcnow
from .database import SessionLocal, init_db
from .models import MonitorTask, NotificationCard, NotificationDelivery, NotificationDeliveryAttempt, NotificationEvent
from .rubika_client import RubikaClient


settings = get_settings()

celery_app = Celery("setadinfo", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.beat_schedule = {
    "poll-due-tasks-every-minute": {
        "task": "app.tasks.poll_due_tasks",
        "schedule": 60.0,
    }
}
celery_app.conf.timezone = "Asia/Tehran"


def _run_async(coro):
    return asyncio.run(coro)


def should_notify_run(status: str, changed_count: int) -> bool:
    return status == "success" and changed_count > 0


def redis_client():
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def acquire_task_lock(task_id: str, ttl_seconds: int = 900) -> str | None:
    token = f"{task_id}:{utcnow().timestamp()}"
    try:
        acquired = redis_client().set(f"setadinfo:monitor-lock:{task_id}", token, nx=True, ex=ttl_seconds)
    except redis.RedisError:
        return token
    return token if acquired else None


def release_task_lock(task_id: str, token: str | None) -> None:
    if not token:
        return
    script = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    end
    return 0
    """
    try:
        redis_client().eval(script, 1, f"setadinfo:monitor-lock:{task_id}", token)
    except redis.RedisError:
        return


def notification_chat_ids(task: MonitorTask, default_chat_id: str = "") -> list[str]:
    result: list[str] = []
    for recipient in getattr(task, "recipients", []) or []:
        chat_id = str(getattr(recipient, "chat_id", "")).strip()
        if getattr(recipient, "enabled", False) and chat_id and chat_id not in result:
            result.append(chat_id)
    if result:
        return result
    fallback = str(getattr(task, "rubika_chat_id", "") or default_chat_id).strip()
    return [fallback] if fallback else []


def notification_recipient_targets(task: MonitorTask, default_chat_id: str = "") -> list[tuple[str | None, str]]:
    result: list[tuple[str | None, str]] = []
    seen: set[str] = set()
    for recipient in getattr(task, "recipients", []) or []:
        chat_id = str(getattr(recipient, "chat_id", "")).strip()
        if getattr(recipient, "enabled", False) and chat_id and chat_id not in seen:
            result.append((getattr(recipient, "id", None), chat_id))
            seen.add(chat_id)
    if result:
        return result
    fallback = str(getattr(task, "rubika_chat_id", "") or default_chat_id).strip()
    return [(None, fallback)] if fallback else []


def delivery_message(db: SessionLocal, event_id: int) -> str:
    card = db.scalar(select(NotificationCard).where(NotificationCard.event_id == event_id))
    if card:
        return card.body
    event = db.get(NotificationEvent, event_id)
    return event.summary if event else ""


def enqueue_event_deliveries(db, task: MonitorTask, events: list[NotificationEvent]) -> list[NotificationDelivery]:
    if not task.notify_rubika or getattr(task, "notification_frequency", "immediate") != "immediate":
        return []
    deliveries: list[NotificationDelivery] = []
    for event in events:
        for recipient_id, chat_id in notification_recipient_targets(task, settings.rubika_default_chat_id):
            existing = db.scalar(
                select(NotificationDelivery).where(
                    NotificationDelivery.event_id == event.id,
                    NotificationDelivery.channel == "rubika",
                    NotificationDelivery.chat_id == chat_id,
                )
            )
            if existing:
                deliveries.append(existing)
                continue
            delivery = NotificationDelivery(
                event_id=event.id,
                recipient_id=recipient_id,
                channel="rubika",
                chat_id=chat_id,
                status="pending",
                attempt_count=0,
            )
            db.add(delivery)
            deliveries.append(delivery)
    return deliveries


def send_pending_deliveries(db, delivery_ids: list[int]) -> list[str]:
    client = RubikaClient()
    errors: list[str] = []
    deliveries = db.scalars(
        select(NotificationDelivery)
        .where(NotificationDelivery.id.in_(delivery_ids), NotificationDelivery.status.in_(["pending", "retrying", "error"]))
        .order_by(NotificationDelivery.id.asc())
    ).all()
    for delivery in deliveries:
        message = delivery_message(db, delivery.event_id)
        if not message.strip():
            delivery.status = "skipped"
            delivery.last_error = "empty notification message"
            continue
        delivery.status = "retrying" if delivery.attempt_count else "pending"
        result = _run_async(client.send_message(delivery.chat_id, message))
        delivery.attempt_count += 1
        delivery.status = "sent" if result.ok else "error"
        delivery.last_error = "" if result.ok else result.error
        delivery.sent_at = utcnow() if result.ok else None
        db.add(
            NotificationDeliveryAttempt(
                delivery_id=delivery.id,
                status=delivery.status,
                error=delivery.last_error,
                response_payload=result.raw if isinstance(result.raw, dict) else {},
            )
        )
        if not result.ok:
            errors.append(f"{delivery.chat_id}: {result.error}")
    return errors


@celery_app.task(name="app.tasks.poll_task")
def poll_task(task_id: str) -> dict:
    init_db()
    lock_token = acquire_task_lock(task_id)
    if not lock_token:
        return {"ok": True, "task_id": task_id, "skipped": "locked"}
    with SessionLocal() as db:
        try:
            task = db.get(MonitorTask, task_id)
            if not task:
                return {"ok": False, "error": "task not found"}
            run = _run_async(ingest_task_run(db, task))
            refresh_task_schedule(task)
            db.flush()
            events = list(db.scalars(select(NotificationEvent).where(NotificationEvent.run_id == run.id).order_by(NotificationEvent.id.asc())).all())
            deliveries = enqueue_event_deliveries(db, task, events)
            db.flush()
            delivery_ids = [delivery.id for delivery in deliveries if delivery.status in {"pending", "retrying", "error"}]
            db.commit()
            errors = send_pending_deliveries(db, delivery_ids)
            baseline_sent = any(
                db.get(NotificationDelivery, delivery_id) and db.get(NotificationDelivery, delivery_id).status == "sent"
                for delivery_id in delivery_ids
            )
            if any(event.event_type == "baseline_summary" for event in events) and baseline_sent:
                task.baseline_notification_sent_at = utcnow()
            db.commit()
            if errors:
                return {"ok": True, "run_id": run.id, "message": run.message, "notification_error": "; ".join(errors)}
            return {"ok": True, "run_id": run.id, "message": run.message}
        finally:
            release_task_lock(task_id, lock_token)


@celery_app.task(name="app.tasks.poll_due_tasks")
def poll_due_tasks() -> dict:
    init_db()
    triggered = []
    with SessionLocal() as db:
        tasks = db.scalars(select(MonitorTask).where(MonitorTask.enabled.is_(True))).all()
        for task in tasks:
            if task.next_run_at is None or task.next_run_at <= utcnow():
                refresh_task_schedule(task)
                poll_task.delay(task.id)
                triggered.append(task.id)
        db.commit()
    return {"ok": True, "triggered": triggered}
