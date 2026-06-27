from __future__ import annotations

import asyncio

from celery import Celery
from sqlalchemy import select

from .config import get_settings
from .crud import ingest_task_run, refresh_task_schedule, render_notification_digest, utcnow
from .database import SessionLocal, init_db
from .models import MonitorTask, NotificationDelivery, NotificationEvent
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


@celery_app.task(name="app.tasks.poll_task")
def poll_task(task_id: str) -> dict:
    init_db()
    with SessionLocal() as db:
        task = db.get(MonitorTask, task_id)
        if not task:
            return {"ok": False, "error": "task not found"}
        run = _run_async(ingest_task_run(db, task))
        refresh_task_schedule(task)
        db.flush()
        events = list(db.scalars(select(NotificationEvent).where(NotificationEvent.run_id == run.id).order_by(NotificationEvent.id.asc())).all())
        db.commit()
        if task.notify_rubika and run.status == "success" and events:
            client = RubikaClient()
            errors = []
            message = render_notification_digest(task, run, events)
            for recipient_id, chat_id in notification_recipient_targets(task, settings.rubika_default_chat_id):
                result = _run_async(client.send_message(chat_id, message))
                for event in events:
                    db.add(
                        NotificationDelivery(
                            event_id=event.id,
                            recipient_id=recipient_id,
                            chat_id=chat_id,
                            status="sent" if result.ok else "error",
                            attempt_count=1,
                            last_error="" if result.ok else result.error,
                            sent_at=utcnow() if result.ok else None,
                        )
                    )
                if not result.ok:
                    errors.append(f"{chat_id}: {result.error}")
            db.commit()
            if errors:
                return {"ok": True, "run_id": run.id, "message": run.message, "notification_error": "; ".join(errors)}
        return {"ok": True, "run_id": run.id, "message": run.message}


@celery_app.task(name="app.tasks.poll_due_tasks")
def poll_due_tasks() -> dict:
    init_db()
    triggered = []
    with SessionLocal() as db:
        tasks = db.scalars(select(MonitorTask).where(MonitorTask.enabled.is_(True))).all()
        for task in tasks:
            if task.next_run_at is None or task.next_run_at <= utcnow():
                poll_task.delay(task.id)
                triggered.append(task.id)
    return {"ok": True, "triggered": triggered}
