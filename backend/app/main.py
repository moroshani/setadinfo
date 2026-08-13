from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis
from sqlalchemy import desc, distinct, func, select
from sqlalchemy.orm import Session

from . import crud
from .auth import can_manage_task, can_write_tasks, create_session_token, hash_password, require_admin, require_user, verify_password
from .config import get_settings
from .crud import cleanup_orphan_listings, listing_to_dict, notification_event_to_dict, offer_to_dict, render_notification_body, schedule_task, serialize_task, stored_listings_page, task_stats
from .database import get_db, init_db
from .filter_catalog import BOARD_OPTIONS, BOARD_TAGS, SEARCH_TYPE_OPTIONS, SORT_OPTIONS
from .models import Listing, MonitorTask, NotificationCard, NotificationDelivery, NotificationDeliveryAttempt, NotificationEvent, Offer, RubikaRecipient, TaskMatch, TaskRun, User
from .rubika_client import RubikaClient, extract_chat_ids, get_all_updates
from .schemas import (
    LiveOfferRequest,
    LiveSearchRequest,
    LoginRequest,
    NotificationPreviewRequest,
    RubikaRecipientCreate,
    RubikaRecipientUpdate,
    RubikaTestRequest,
    TaskCreate,
    TaskUpdate,
    UserCreate,
    UserUpdate,
)
from .setad_client import SetadClient, SetadRateLimitError, SetadRequestError, SetadUpstreamError
from .tasks import poll_task, send_pending_deliveries


settings = get_settings()
app = FastAPI(title="SetadInfo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_base_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SetadUpstreamError)
def setad_upstream_error(_, exc: SetadUpstreamError):
    status_code = 504 if exc.timeout else 502
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": "ارتباط با سرویس عمومی Setad پس از چند تلاش ناموفق بود. دوباره تلاش کنید.",
            "code": "setad_upstream_unavailable",
            "attempts": exc.attempts,
            "upstream_status": exc.status_code,
        },
    )


@app.exception_handler(SetadRateLimitError)
def setad_rate_limit_error(_, exc: SetadRateLimitError):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "محدودیت موقت برد عمومی Setad فعال شده است و نسخه ذخیره‌شده‌ای برای این جستجو وجود ندارد. کمی بعد دوباره تلاش کنید.",
            "code": "setad_public_limit",
        },
    )


@app.exception_handler(SetadRequestError)
def setad_request_error(_, exc: SetadRequestError):
    return JSONResponse(
        status_code=422 if exc.status_code in {400, 422} else 502,
        content={
            "detail": "Setad این ترکیب جستجو را نپذیرفت. فیلترها یا شماره معامله را بررسی کنید.",
            "code": "setad_request_rejected",
            "upstream_status": exc.status_code,
        },
    )


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "setadinfo"}


@app.get("/api/system/status")
def system_status(db: Session = Depends(get_db), user: User = Depends(require_user)):
    db_ok = bool(db.scalar(select(func.count()).select_from(User)) is not None)
    try:
        redis.Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1).ping()
        redis_ok = True
    except redis.RedisError:
        redis_ok = False
    return {
        "db": {"ok": db_ok},
        "redis": {"ok": redis_ok},
        "setad": {"base_url": settings.setad_base_url, "cache_ttl_seconds": settings.setad_cache_ttl_seconds},
        "rubika": {
            "configured": RubikaClient().available,
            "default_chat_configured": bool(settings.rubika_default_chat_id.strip()),
        },
        "worker": {"expected": "celery worker app.tasks.celery_app"},
        "beat": {"expected": "celery beat app.tasks.celery_app", "schedule_seconds": 60},
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == payload.username.strip()))
    if not user or not user.enabled or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    response.set_cookie(
        "setadinfo_session",
        create_session_token(user.id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )
    return {"ok": True}


@app.post("/api/auth/logout")
def logout(response: Response, user: User = Depends(require_user)):
    response.delete_cookie("setadinfo_session", path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def me(user: User = Depends(require_user)):
    return {"ok": True, "id": user.id, "username": user.username, "role": user.role}


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "enabled": user.enabled,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def visible_tasks(db: Session, user: User) -> list[MonitorTask]:
    stmt = select(MonitorTask).order_by(desc(MonitorTask.updated_at))
    if user.role == "operator":
        stmt = stmt.where(MonitorTask.owner_id == user.id)
    return list(db.scalars(stmt).all())


def ensure_task_visible(task: MonitorTask | None, user: User) -> MonitorTask:
    if not task or (user.role == "operator" and task.owner_id != user.id):
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def ensure_listing_visible(db: Session, listing: Listing | None, user: User) -> Listing:
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if user.role == "operator":
        visible = db.scalar(
            select(TaskMatch.id)
            .join(MonitorTask, MonitorTask.id == TaskMatch.task_id)
            .where(TaskMatch.listing_id == listing.id, MonitorTask.owner_id == user.id)
            .limit(1)
        )
        if not visible:
            raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@app.get("/api/users")
def list_users(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return {"items": [user_to_dict(item) for item in db.scalars(select(User).order_by(User.username.asc())).all()]}


@app.post("/api/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    username = payload.username.strip()
    if db.scalar(select(User.id).where(User.username == username)):
        raise HTTPException(status_code=409, detail="Username already exists")
    created = User(
        username=username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        enabled=payload.enabled,
    )
    db.add(created)
    db.commit()
    db.refresh(created)
    return user_to_dict(created)


@app.put("/api/users/{user_id}")
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user.id and (not payload.enabled or payload.role != "admin"):
        raise HTTPException(status_code=400, detail="You cannot remove your own administrator access")
    target.role = payload.role
    target.enabled = payload.enabled
    if payload.password:
        target.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(target)
    return user_to_dict(target)


@app.get("/api/meta/filters")
def meta_filters(user: User = Depends(require_user)):
    return {
        "sortOptions": SORT_OPTIONS,
        "searchTypeOptions": SEARCH_TYPE_OPTIONS,
        "boardOptions": BOARD_OPTIONS,
        "tagLabels": BOARD_TAGS,
    }


@app.get("/api/meta/categories")
async def meta_categories(search: str = "", page: int = 0, page_size: int = 50, user: User = Depends(require_user)):
    return await SetadClient().list_categories(search=search, page_number=page, page_size=page_size)


@app.get("/api/meta/organizations")
async def meta_organizations(search: str = "", page: int = 0, page_size: int = 50, user: User = Depends(require_user)):
    return await SetadClient().list_organizations(search=search, page_number=page, page_size=page_size)


@app.get("/api/meta/cities")
async def meta_cities(parent_loc_id: int | None = None, page: int = 0, page_size: int = 50, user: User = Depends(require_user)):
    return await SetadClient().list_cities(parent_loc_id=parent_loc_id, page_number=page, page_size=page_size)


@app.post("/api/live/search")
async def live_search(payload: LiveSearchRequest, user: User = Depends(require_user)):
    return await crud.fetch_live_results(
        payload.filters.model_dump(),
        page_number=payload.page,
        page_size=payload.page_size,
    )


@app.post("/api/live/offers")
async def live_offers(payload: LiveOfferRequest, user: User = Depends(require_user)):
    items = await crud.fetch_live_offers(payload.party_number, payload.board_code, payload.tag_code)
    return {"items": items}


@app.get("/api/integrations/rubika/status")
def rubika_status(user: User = Depends(require_user)):
    return {
        "configured": RubikaClient().available,
        "default_chat_configured": bool(settings.rubika_default_chat_id.strip()),
    }


@app.get("/api/integrations/rubika/chats")
async def rubika_chats(user: User = Depends(require_user)):
    result = await get_all_updates(limit=100)
    if not result.ok:
        raise HTTPException(status_code=503, detail=result.error)
    return {"items": extract_chat_ids(result.raw), "raw": result.raw}


@app.post("/api/integrations/rubika/test")
async def rubika_test(payload: RubikaTestRequest, user: User = Depends(require_admin)):
    chat_id = payload.chat_id.strip() or settings.rubika_default_chat_id.strip()
    if not chat_id:
        raise HTTPException(status_code=422, detail="Rubika chat_id is required")
    result = await RubikaClient().send_message(chat_id, payload.text)
    if not result.ok:
        raise HTTPException(status_code=503, detail=result.error)
    return {"ok": True, "result": result.raw}


def recipient_to_dict(recipient: RubikaRecipient) -> dict:
    return {
        "id": recipient.id,
        "name": recipient.name,
        "recipient_type": recipient.recipient_type,
        "chat_id": recipient.chat_id,
        "enabled": recipient.enabled,
        "created_at": recipient.created_at,
        "updated_at": recipient.updated_at,
    }


@app.get("/api/integrations/rubika/recipients")
def list_rubika_recipients(db: Session = Depends(get_db), user: User = Depends(require_user)):
    items = db.scalars(select(RubikaRecipient).order_by(RubikaRecipient.name.asc())).all()
    return {"items": [recipient_to_dict(item) for item in items]}


@app.post("/api/integrations/rubika/recipients")
def create_rubika_recipient(payload: RubikaRecipientCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    chat_id = payload.chat_id.strip()
    if db.scalar(select(RubikaRecipient.id).where(RubikaRecipient.chat_id == chat_id)):
        raise HTTPException(status_code=409, detail="Rubika chat_id already exists")
    recipient = RubikaRecipient(
        name=payload.name.strip(),
        recipient_type=payload.recipient_type,
        chat_id=chat_id,
        enabled=payload.enabled,
    )
    db.add(recipient)
    db.commit()
    db.refresh(recipient)
    return recipient_to_dict(recipient)


@app.put("/api/integrations/rubika/recipients/{recipient_id}")
def update_rubika_recipient(
    recipient_id: str,
    payload: RubikaRecipientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    recipient = db.get(RubikaRecipient, recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    duplicate = db.scalar(
        select(RubikaRecipient.id).where(
            RubikaRecipient.chat_id == payload.chat_id.strip(),
            RubikaRecipient.id != recipient_id,
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Rubika chat_id already exists")
    recipient.name = payload.name.strip()
    recipient.recipient_type = payload.recipient_type
    recipient.chat_id = payload.chat_id.strip()
    recipient.enabled = payload.enabled
    db.commit()
    db.refresh(recipient)
    return recipient_to_dict(recipient)


@app.delete("/api/integrations/rubika/recipients/{recipient_id}")
def delete_rubika_recipient(recipient_id: str, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    recipient = db.get(RubikaRecipient, recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    db.delete(recipient)
    db.commit()
    return {"ok": True}


def task_recipients(db: Session, recipient_ids: list[str]) -> list[RubikaRecipient]:
    unique_ids = list(dict.fromkeys(recipient_ids))
    if not unique_ids:
        return []
    recipients = list(db.scalars(select(RubikaRecipient).where(RubikaRecipient.id.in_(unique_ids))).all())
    if len(recipients) != len(unique_ids):
        raise HTTPException(status_code=422, detail="One or more Rubika recipients do not exist")
    return recipients


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_user)):
    tasks = visible_tasks(db, user)
    if user.role == "operator":
        total_listings = db.scalar(
            select(func.count(distinct(TaskMatch.listing_id)))
            .join(MonitorTask, MonitorTask.id == TaskMatch.task_id)
            .where(MonitorTask.owner_id == user.id)
        ) or 0
        total_runs = db.scalar(
            select(func.count(TaskRun.id)).join(MonitorTask, MonitorTask.id == TaskRun.task_id).where(MonitorTask.owner_id == user.id)
        ) or 0
        stats = {
            "total_tasks": len(tasks),
            "enabled_tasks": sum(1 for task in tasks if task.enabled),
            "total_listings": total_listings,
            "total_runs": total_runs,
            "last_run": db.scalar(
                select(TaskRun.started_at)
                .join(MonitorTask, MonitorTask.id == TaskRun.task_id)
                .where(MonitorTask.owner_id == user.id)
                .order_by(desc(TaskRun.started_at))
                .limit(1)
            ),
        }
    else:
        stats = task_stats(db)
    return {"stats": stats, "tasks": [serialize_task(task) for task in tasks]}


@app.get("/api/tasks")
def list_tasks(db: Session = Depends(get_db), user: User = Depends(require_user)):
    return {"items": [serialize_task(task) for task in visible_tasks(db, user)]}


@app.post("/api/tasks")
def create_task(payload: TaskCreate, db: Session = Depends(get_db), user: User = Depends(require_user)):
    if not can_write_tasks(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Read-only role")
    task = MonitorTask(
        name=payload.name,
        description=payload.description,
        enabled=payload.enabled,
        interval_minutes=max(settings.setad_min_interval_minutes, payload.interval_minutes),
        filters=payload.filters.model_dump(),
        include_offers=payload.include_offers,
        notify_rubika=payload.notify_rubika,
        notify_initial=payload.notify_initial,
        notify_new_listings=payload.notify_new_listings,
        notify_listing_changes=payload.notify_listing_changes,
        notify_offer_changes=payload.notify_offer_changes,
        notification_frequency=payload.notification_frequency,
        notification_event_types=crud.normalize_event_types(payload.notification_event_types),
        rubika_chat_id=payload.rubika_chat_id,
        owner_id=user.id,
    )
    task.recipients = task_recipients(db, payload.recipient_ids)
    schedule_task(task)
    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@app.put("/api/tasks/{task_id}")
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db), user: User = Depends(require_user)):
    task = db.get(MonitorTask, task_id)
    if not task or not can_manage_task(user, task):
        raise HTTPException(status_code=404, detail="Task not found")
    task.name = payload.name
    task.description = payload.description
    task.enabled = payload.enabled
    task.interval_minutes = max(settings.setad_min_interval_minutes, payload.interval_minutes)
    task.filters = payload.filters.model_dump()
    task.include_offers = payload.include_offers
    task.notify_rubika = payload.notify_rubika
    task.notify_initial = payload.notify_initial
    task.notify_new_listings = payload.notify_new_listings
    task.notify_listing_changes = payload.notify_listing_changes
    task.notify_offer_changes = payload.notify_offer_changes
    task.notification_frequency = payload.notification_frequency
    task.notification_event_types = crud.normalize_event_types(payload.notification_event_types)
    task.rubika_chat_id = payload.rubika_chat_id
    task.recipients = task_recipients(db, payload.recipient_ids)
    schedule_task(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    task = db.get(MonitorTask, task_id)
    if not task or not can_manage_task(user, task):
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.flush()
    cleanup_orphan_listings(db)
    db.commit()
    return {"ok": True}


@app.post("/api/tasks/{task_id}/run")
def run_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    task = db.get(MonitorTask, task_id)
    if not task or not can_manage_task(user, task):
        raise HTTPException(status_code=404, detail="Task not found")
    poll_task.delay(task_id)
    return {"ok": True, "queued": True}


@app.get("/api/tasks/{task_id}/health")
def task_health(task_id: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    task = ensure_task_visible(db.get(MonitorTask, task_id), user)
    last_run = db.scalar(select(TaskRun).where(TaskRun.task_id == task_id).order_by(desc(TaskRun.started_at)).limit(1))
    pending_deliveries = db.scalar(
        select(func.count())
        .select_from(NotificationDelivery)
        .join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id)
        .where(NotificationEvent.task_id == task_id, NotificationDelivery.status.in_(["pending", "retrying", "error"]))
    ) or 0
    needs_attention = bool(
        not task.enabled
        or not task.baseline_captured_at
        or (last_run and last_run.status == "error")
        or pending_deliveries
        or getattr(task, "consecutive_failure_count", 0)
    )
    return {
        "task_id": task.id,
        "enabled": task.enabled,
        "needs_attention": needs_attention,
        "last_run_status": last_run.status if last_run else "never_run",
        "last_run_message": last_run.message if last_run else "",
        "next_run_at": task.next_run_at,
        "baseline_captured_at": task.baseline_captured_at or task.baseline_notified_at,
        "consecutive_failure_count": getattr(task, "consecutive_failure_count", 0),
        "pending_delivery_count": pending_deliveries,
    }


@app.get("/api/runs")
def list_runs(task_id: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_user)):
    stmt = select(TaskRun).order_by(desc(TaskRun.started_at))
    if task_id:
        ensure_task_visible(db.get(MonitorTask, task_id), user)
        stmt = stmt.where(TaskRun.task_id == task_id)
    elif user.role == "operator":
        stmt = stmt.join(MonitorTask, MonitorTask.id == TaskRun.task_id).where(MonitorTask.owner_id == user.id)
    return {
        "items": [
            {
                "id": run.id,
                "task_id": run.task_id,
                "started_at": run.started_at,
                "finished_at": run.finished_at,
                "status": run.status,
                "message": run.message,
                "fetched_count": run.fetched_count,
                "matched_count": run.matched_count,
                "changed_count": run.changed_count,
            }
            for run in db.scalars(stmt).all()
        ]
    }


@app.get("/api/notifications")
def list_notifications(
    task_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=300),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    stmt = select(NotificationEvent).order_by(desc(NotificationEvent.created_at), desc(NotificationEvent.id)).limit(limit)
    if task_id:
        ensure_task_visible(db.get(MonitorTask, task_id), user)
        stmt = stmt.where(NotificationEvent.task_id == task_id)
    elif user.role == "operator":
        stmt = stmt.join(MonitorTask, MonitorTask.id == NotificationEvent.task_id).where(MonitorTask.owner_id == user.id)
    return {"items": [notification_event_to_dict(item) for item in db.scalars(stmt).all()]}


@app.post("/api/notifications/preview")
def notification_preview(payload: NotificationPreviewRequest, user: User = Depends(require_user)):
    listing = {
        "trade_number": "310500053001552",
        "title": "خرید آسفالت گرم",
        "organization": "شهرداری منطقه ۲ تهران",
        "province": "تهران",
        "city": "تهران",
        "send_deadline": "۱۴۰۳/۰۴/۱۸ - ۱۴:۰۰",
        "price": 18_500_000_000,
        **payload.listing,
    }
    body_payload: dict[str, object] = {
        "monitor_name": payload.task_name,
        "listing": listing,
        "why_sent": "این پیام نمونه نشان می‌دهد کاربر در Rubika چه متنی دریافت می‌کند.",
    }
    if payload.offer:
        body_payload["offer"] = {
            "bidder_name": "شرکت نمونه",
            "amount": 850_000_000,
            "submitted_at": "۱۴۰۳/۰۴/۱۸ - ۱۲:۰۰",
            "status": "فعال",
            "rank": "۱",
            **payload.offer,
        }
    if payload.changed_fields:
        body_payload["changed_fields"] = payload.changed_fields
        body_payload["changes"] = {
            str(item.get("field", index)): {
                "label": item.get("label", item.get("field", "تغییر")),
                "before": item.get("before"),
                "after": item.get("after"),
            }
            for index, item in enumerate(payload.changed_fields)
        }
    if payload.event_type == "baseline_summary":
        body_payload = {
            "monitor_name": payload.task_name,
            "listing_count": 3,
            "listings": [listing],
            "why_sent": "این پیام فقط برای ثبت لیست اولیه پایش ارسال می‌شود. بعد از آن فقط تغییرهای جدید اطلاع داده می‌شود.",
        }
    message = render_notification_body(payload.event_type, "پیش‌نمایش اعلان", "", body_payload)
    return {"message": message}


def delivery_to_dict(db: Session, delivery: NotificationDelivery) -> dict:
    event = db.get(NotificationEvent, delivery.event_id)
    card = db.scalar(select(NotificationCard).where(NotificationCard.event_id == delivery.event_id))
    attempts = db.scalars(
        select(NotificationDeliveryAttempt)
        .where(NotificationDeliveryAttempt.delivery_id == delivery.id)
        .order_by(desc(NotificationDeliveryAttempt.attempted_at))
        .limit(5)
    ).all()
    return {
        "id": delivery.id,
        "event_id": delivery.event_id,
        "task_id": event.task_id if event else None,
        "recipient_id": delivery.recipient_id,
        "channel": delivery.channel,
        "chat_id": delivery.chat_id,
        "status": delivery.status,
        "attempt_count": delivery.attempt_count,
        "last_error": delivery.last_error,
        "sent_at": delivery.sent_at,
        "created_at": delivery.created_at,
        "card": {"title": card.title, "reason": card.reason, "body": card.body} if card else None,
        "attempts": [
            {
                "id": attempt.id,
                "status": attempt.status,
                "error": attempt.error,
                "attempted_at": attempt.attempted_at,
            }
            for attempt in attempts
        ],
    }


@app.get("/api/deliveries")
def list_deliveries(
    task_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=300),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    stmt = select(NotificationDelivery).join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id).order_by(desc(NotificationDelivery.created_at)).limit(limit)
    if task_id:
        ensure_task_visible(db.get(MonitorTask, task_id), user)
        stmt = stmt.where(NotificationEvent.task_id == task_id)
    elif user.role == "operator":
        stmt = stmt.join(MonitorTask, MonitorTask.id == NotificationEvent.task_id).where(MonitorTask.owner_id == user.id)
    if status_filter:
        stmt = stmt.where(NotificationDelivery.status == status_filter)
    return {"items": [delivery_to_dict(db, item) for item in db.scalars(stmt).all()]}


@app.post("/api/deliveries/{delivery_id}/retry")
def retry_delivery(delivery_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    delivery = db.get(NotificationDelivery, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    delivery.status = "retrying"
    db.commit()
    errors = send_pending_deliveries(db, [delivery_id])
    db.commit()
    db.refresh(delivery)
    return {"ok": not errors, "delivery": delivery_to_dict(db, delivery), "errors": errors}


@app.get("/api/listings")
def list_listings(
    task_id: str | None = None,
    q: str = "",
    board_code: int | None = None,
    sort_by: str = "last_seen_at",
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=0, ge=0),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    if task_id:
        ensure_task_visible(db.get(MonitorTask, task_id), user)
    return stored_listings_page(
        db,
        page=page,
        page_size=page_size,
        task_id=task_id,
        owner_id=user.id if user.role == "operator" else None,
        q=q,
        board_code=board_code,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


@app.get("/api/listings/{listing_id}")
def listing_detail(listing_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    listing = ensure_listing_visible(db, db.get(Listing, listing_id), user)
    offers = db.scalars(select(Offer).where(Offer.listing_id == listing_id).order_by(desc(Offer.last_seen_at))).all()
    return {"listing": listing_to_dict(listing), "offers": [offer_to_dict(offer) for offer in offers]}


@app.get("/api/listings/{listing_id}/offers")
def listing_offers(listing_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    ensure_listing_visible(db, db.get(Listing, listing_id), user)
    offers = db.scalars(select(Offer).where(Offer.listing_id == listing_id).order_by(desc(Offer.last_seen_at))).all()
    return {"items": [offer_to_dict(offer) for offer in offers]}


@app.get("/api/export/tasks")
def export_tasks(db: Session = Depends(get_db), user: User = Depends(require_user)):
    return JSONResponse([serialize_task(task) for task in visible_tasks(db, user)])
