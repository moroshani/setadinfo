from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.config import get_settings
from app.database import SessionLocal, init_db
from app.models import (
    Listing,
    MonitorTask,
    NotificationDelivery,
    NotificationEvent,
    Offer,
    RubikaRecipient,
    TaskMatch,
    TaskRun,
    User,
    monitor_task_recipients,
)


DEMO_PASSWORD = "SetadInfo-demo-1234"
DEMO_OPERATOR_ID = "demo-operator-user"
DEMO_VIEWER_ID = "demo-viewer-user"
DEMO_RECIPIENT_ID = "demo-rubika-recipient"
DEMO_TENDER_TASK_ID = "demo-task-tender-asphalt"
DEMO_AUCTION_TASK_ID = "demo-task-auction-cooler"
DEMO_ITEM_TASK_ID = "demo-task-item-vehicle"
DEMO_TASK_IDS = [DEMO_TENDER_TASK_ID, DEMO_AUCTION_TASK_ID, DEMO_ITEM_TASK_ID]
DEMO_USER_IDS = [DEMO_OPERATOR_ID, DEMO_VIEWER_ID]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def content_hash(value: dict[str, Any]) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True).encode()
    return hashlib.sha256(encoded).hexdigest()


def reset_demo_data(db: Session) -> None:
    listing_ids = list(db.scalars(select(Listing.id).where(Listing.source_key.like("demo:%"))).all())
    event_ids = list(db.scalars(select(NotificationEvent.id).where(NotificationEvent.dedupe_key.like("demo:%"))).all())

    if event_ids:
        db.execute(delete(NotificationDelivery).where(NotificationDelivery.event_id.in_(event_ids)))
    db.execute(delete(NotificationEvent).where(NotificationEvent.dedupe_key.like("demo:%")))
    db.execute(delete(monitor_task_recipients).where(monitor_task_recipients.c.task_id.in_(DEMO_TASK_IDS)))
    db.execute(delete(TaskMatch).where(TaskMatch.task_id.in_(DEMO_TASK_IDS)))
    if listing_ids:
        db.execute(delete(TaskMatch).where(TaskMatch.listing_id.in_(listing_ids)))
        db.execute(delete(Offer).where(Offer.listing_id.in_(listing_ids)))
        db.execute(delete(Listing).where(Listing.id.in_(listing_ids)))
    db.execute(delete(MonitorTask).where(MonitorTask.id.in_(DEMO_TASK_IDS)))
    db.execute(delete(RubikaRecipient).where(RubikaRecipient.id == DEMO_RECIPIENT_ID))
    db.execute(delete(RubikaRecipient).where(RubikaRecipient.chat_id == "demo-rubika-chat"))
    db.execute(delete(User).where(User.id.in_(DEMO_USER_IDS)))
    db.execute(delete(User).where(User.username.in_(["demo-operator", "demo-viewer"])))
    db.flush()


def add_user(db: Session, *, user_id: str, username: str, role: str) -> User:
    user = User(
        id=user_id,
        username=username,
        password_hash=hash_password(DEMO_PASSWORD),
        role=role,
        enabled=True,
    )
    db.add(user)
    return user


def add_listing(db: Session, **values: Any) -> Listing:
    raw = values.setdefault("raw", {})
    values.setdefault("content_hash", content_hash(raw or values))
    listing = Listing(**values)
    db.add(listing)
    return listing


def add_offer(db: Session, **values: Any) -> Offer:
    raw = values.setdefault("raw", {})
    values.setdefault("content_hash", content_hash(raw or values))
    offer = Offer(**values)
    db.add(offer)
    return offer


def add_event(
    db: Session,
    *,
    task: MonitorTask,
    run: TaskRun,
    listing: Listing | None,
    offer: Offer | None = None,
    event_type: str,
    title: str,
    summary: str,
    payload: dict[str, Any],
    minutes_ago: int,
    severity: str = "info",
) -> NotificationEvent:
    event = NotificationEvent(
        task_id=task.id,
        run_id=run.id,
        listing_id=listing.id if listing else None,
        offer_id=offer.id if offer else None,
        event_type=event_type,
        severity=severity,
        title=title,
        summary=summary,
        payload=payload,
        dedupe_key=f"demo:{task.id}:{event_type}:{listing.source_key if listing else run.id}:{offer.source_key if offer else ''}",
        created_at=utcnow() - timedelta(minutes=minutes_ago),
    )
    db.add(event)
    return event


def listing_payload(listing: Listing) -> dict[str, Any]:
    return {
        "source_key": listing.source_key,
        "trade_number": listing.trade_number,
        "party_number": listing.party_number,
        "board_code": listing.board_code,
        "tag_code": listing.tag_code,
        "title": listing.title,
        "organization": listing.organization,
        "province": listing.province,
        "city": listing.city,
        "category": listing.category,
        "send_deadline": listing.send_deadline,
        "document_deadline": listing.document_deadline,
        "price": listing.price,
        "content_hash": listing.content_hash,
    }


def offer_payload(offer: Offer) -> dict[str, Any]:
    return {
        "source_key": offer.source_key,
        "bidder_name": offer.bidder_name,
        "amount": offer.amount,
        "submitted_at": offer.submitted_at,
        "status": offer.status,
        "rank": offer.rank,
        "content_hash": offer.content_hash,
    }


def seed_demo_data(db: Session) -> dict[str, Any]:
    reset_demo_data(db)

    settings = get_settings()
    admin = db.scalar(select(User).where(User.username == settings.admin_username))
    if not admin:
        admin = User(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            role="admin",
            enabled=True,
        )
        db.add(admin)
        db.flush()

    operator = add_user(db, user_id=DEMO_OPERATOR_ID, username="demo-operator", role="operator")
    viewer = add_user(db, user_id=DEMO_VIEWER_ID, username="demo-viewer", role="viewer")
    recipient = RubikaRecipient(
        id=DEMO_RECIPIENT_ID,
        name="گروه نمونه اعلان‌ها",
        recipient_type="chat",
        chat_id="demo-rubika-chat",
        enabled=True,
    )
    db.add(recipient)
    db.flush()

    now = utcnow()
    tender_task = MonitorTask(
        id=DEMO_TENDER_TASK_ID,
        name="نمونه: پایش مناقصه آسفالت تهران",
        description="کلیدواژه‌های آسفالت و بهسازی در مناقصه‌های عمومی تهران.",
        enabled=True,
        interval_minutes=60,
        filters={
            "monitorMode": "filter",
            "searchTypeCode": 0,
            "keywords": ["آسفالت", "بهسازی"],
            "excludedKeywords": ["قیر خام"],
            "boardCodes": [2],
            "tagCodes": [4121],
            "selectedProvinces": ["تهران"],
            "sort": "newerInsertDate",
        },
        include_offers=False,
        notify_rubika=True,
        notify_initial=True,
        notify_new_listings=True,
        notify_listing_changes=True,
        notify_offer_changes=False,
        owner_id=operator.id,
        last_run_at=now - timedelta(minutes=18),
        next_run_at=now + timedelta(minutes=42),
        baseline_notified_at=now - timedelta(days=2),
        last_successful_run_id=1,
    )
    tender_task.recipients = [recipient]

    auction_task = MonitorTask(
        id=DEMO_AUCTION_TASK_ID,
        name="نمونه: پایش مزایده تجهیزات سرمایشی",
        description="مزایده‌های کولر و تجهیزات سرمایشی با تاریخچه پیشنهادها.",
        enabled=True,
        interval_minutes=30,
        filters={
            "monitorMode": "filter",
            "searchTypeCode": 0,
            "keywords": ["کولر", "سرمایشی"],
            "boardCodes": [3],
            "tagCodes": [343],
            "sort": "onPerforming",
        },
        include_offers=True,
        notify_rubika=True,
        notify_initial=True,
        notify_new_listings=True,
        notify_listing_changes=True,
        notify_offer_changes=True,
        owner_id=operator.id,
        last_run_at=now - timedelta(minutes=7),
        next_run_at=now + timedelta(minutes=23),
        baseline_notified_at=now - timedelta(days=1, hours=4),
        last_successful_run_id=2,
    )
    auction_task.recipients = [recipient]

    item_task = MonitorTask(
        id=DEMO_ITEM_TASK_ID,
        name="نمونه: پایش تک‌آگهی خودرو",
        description="نمونه monitorMode=item برای ردیابی یک شماره معامله مشخص.",
        enabled=False,
        interval_minutes=120,
        filters={
            "monitorMode": "item",
            "searchTypeCode": 1,
            "targetSourceKey": "demo:listing:vehicle",
            "targetTradeNumber": "310500053001700",
            "targetPartyNumber": "1403-VEH-17",
            "targetBoardCode": 3,
            "targetTagCode": 35,
            "keyword": "310500053001700",
            "keywords": ["310500053001700"],
        },
        include_offers=True,
        notify_rubika=False,
        notify_initial=True,
        notify_new_listings=True,
        notify_listing_changes=True,
        notify_offer_changes=True,
        owner_id=admin.id,
        last_run_at=now - timedelta(days=3),
        next_run_at=None,
        baseline_notified_at=now - timedelta(days=3),
    )
    db.add_all([tender_task, auction_task, item_task])
    db.flush()

    tender_listing = add_listing(
        db,
        source_key="demo:listing:asphalt-tehran",
        trade_number="310500053001552",
        board_code=2,
        tag_code=4121,
        party_number="1403-TND-552",
        title="مناقصه اجرای روکش آسفالت و لکه‌گیری معابر منطقه ۲",
        description="اجرای عملیات تراش، زیرسازی و روکش آسفالت در چند محور شهری.",
        organization="شهرداری منطقه ۲ تهران",
        province="تهران",
        city="تهران",
        category="راه‌سازی و آسفالت",
        send_deadline="1403/04/18 - 14:00",
        document_deadline="1403/04/12 - 16:00",
        price=18500000000,
        detail_url="https://setadiran.ir/demo/asphalt-tehran",
        raw={
            "demo": True,
            "qualityEvaluation": "دارد",
            "guaranteeAmount": "925,000,000 ریال",
            "changeNote": "مهلت ارسال پیشنهاد دو روز تمدید شد.",
        },
        first_seen_at=now - timedelta(days=2),
        last_seen_at=now - timedelta(minutes=18),
    )
    tender_listing_2 = add_listing(
        db,
        source_key="demo:listing:bridge-maintenance",
        trade_number="310500053001601",
        board_code=2,
        tag_code=4128,
        party_number="1403-TND-601",
        title="مناقصه نگهداری پل‌های عابر و تابلوهای ترافیکی",
        description="بازدید دوره‌ای، تعمیرات سبک و تامین قطعات مصرفی.",
        organization="اداره کل راهداری و حمل‌ونقل جاده‌ای البرز",
        province="البرز",
        city="کرج",
        category="نگهداری راه و تجهیزات شهری",
        send_deadline="1403/04/21 - 12:00",
        document_deadline="1403/04/15 - 15:00",
        price=7400000000,
        detail_url="https://setadiran.ir/demo/bridge-maintenance",
        raw={"demo": True, "evaluation": "همزمان با ارزیابی"},
        first_seen_at=now - timedelta(hours=9),
        last_seen_at=now - timedelta(minutes=18),
    )
    auction_listing = add_listing(
        db,
        source_key="demo:listing:cooler-auction",
        trade_number="310500053001555",
        board_code=3,
        tag_code=343,
        party_number="1403-AUC-555",
        title="مزایده فروش ۳۲ دستگاه کولر گازی کارکرده",
        description="کولرهای اسپیلت و پنجره‌ای مازاد انبار مرکزی با امکان بازدید حضوری.",
        organization="دانشگاه علوم پزشکی اصفهان",
        province="اصفهان",
        city="اصفهان",
        category="تجهیزات سرمایشی و تهویه",
        send_deadline="1403/04/16 - 10:00",
        document_deadline="1403/04/10 - 13:00",
        price=620000000,
        detail_url="https://setadiran.ir/demo/cooler-auction",
        raw={"demo": True, "visitWindow": "1403/04/08 تا 1403/04/10", "offerCount": 3},
        first_seen_at=now - timedelta(days=1, hours=4),
        last_seen_at=now - timedelta(minutes=7),
    )
    vehicle_listing = add_listing(
        db,
        source_key="demo:listing:vehicle",
        trade_number="310500053001700",
        board_code=3,
        tag_code=35,
        party_number="1403-VEH-17",
        title="مزایده خودروی سواری کارکرده سازمانی",
        description="یک دستگاه خودروی سواری مدل ۱۳۹۷ با بازدید در محل انبار.",
        organization="سازمان مدیریت پسماند شیراز",
        province="فارس",
        city="شیراز",
        category="خودرو سبک",
        send_deadline="1403/04/25 - 11:00",
        document_deadline="1403/04/20 - 14:00",
        price=4100000000,
        detail_url="https://setadiran.ir/demo/vehicle",
        raw={"demo": True, "plateStatus": "فاقد پلاک فعال"},
        first_seen_at=now - timedelta(days=3),
        last_seen_at=now - timedelta(days=3),
    )
    db.flush()

    run_tender = TaskRun(
        task_id=tender_task.id,
        started_at=now - timedelta(minutes=20),
        finished_at=now - timedelta(minutes=18),
        status="success",
        message="۲ آگهی مطابق پیدا شد؛ ۱ تغییر مهلت ثبت شد.",
        fetched_count=42,
        matched_count=2,
        changed_count=1,
    )
    run_auction = TaskRun(
        task_id=auction_task.id,
        started_at=now - timedelta(minutes=9),
        finished_at=now - timedelta(minutes=7),
        status="success",
        message="۱ مزایده مطابق و ۳ پیشنهاد ذخیره شد.",
        fetched_count=18,
        matched_count=1,
        changed_count=2,
    )
    run_item = TaskRun(
        task_id=item_task.id,
        started_at=now - timedelta(days=3, minutes=8),
        finished_at=now - timedelta(days=3, minutes=6),
        status="success",
        message="تک‌آگهی هدف ذخیره شد. پایش فعلا غیرفعال است.",
        fetched_count=1,
        matched_count=1,
        changed_count=0,
    )
    db.add_all([run_tender, run_auction, run_item])
    db.flush()
    tender_task.last_successful_run_id = run_tender.id
    auction_task.last_successful_run_id = run_auction.id
    item_task.last_successful_run_id = run_item.id

    db.add_all(
        [
            TaskMatch(task_id=tender_task.id, listing_id=tender_listing.id, first_seen_at=tender_listing.first_seen_at, last_seen_at=tender_listing.last_seen_at, last_changed_at=now - timedelta(minutes=18)),
            TaskMatch(task_id=tender_task.id, listing_id=tender_listing_2.id, first_seen_at=tender_listing_2.first_seen_at, last_seen_at=tender_listing_2.last_seen_at),
            TaskMatch(task_id=auction_task.id, listing_id=auction_listing.id, first_seen_at=auction_listing.first_seen_at, last_seen_at=auction_listing.last_seen_at, last_changed_at=now - timedelta(minutes=7)),
            TaskMatch(task_id=item_task.id, listing_id=vehicle_listing.id, first_seen_at=vehicle_listing.first_seen_at, last_seen_at=vehicle_listing.last_seen_at),
        ]
    )

    offer_1 = add_offer(
        db,
        listing_id=auction_listing.id,
        source_key="demo:offer:cooler:1",
        bidder_name="شرکت آذرتهویه سپاهان",
        amount=710000000,
        submitted_at="1403/04/13 - 09:20",
        status="ثبت معتبر",
        rank="۱",
        raw={"demo": True, "change": "مبلغ پیشنهاد نسبت به اجرای قبل افزایش یافت."},
        first_seen_at=now - timedelta(hours=6),
        last_seen_at=now - timedelta(minutes=7),
    )
    offer_2 = add_offer(
        db,
        listing_id=auction_listing.id,
        source_key="demo:offer:cooler:2",
        bidder_name="تجهیزگستر پارس",
        amount=685000000,
        submitted_at="1403/04/13 - 10:05",
        status="ثبت معتبر",
        rank="۲",
        raw={"demo": True},
        first_seen_at=now - timedelta(hours=5),
        last_seen_at=now - timedelta(minutes=7),
    )
    offer_3 = add_offer(
        db,
        listing_id=auction_listing.id,
        source_key="demo:offer:cooler:3",
        bidder_name="فروشگاه صنعت برودت",
        amount=660000000,
        submitted_at="1403/04/13 - 11:42",
        status="جدید",
        rank="۳",
        raw={"demo": True, "newInRun": True},
        first_seen_at=now - timedelta(minutes=7),
        last_seen_at=now - timedelta(minutes=7),
    )
    db.flush()

    events = [
        add_event(
            db,
            task=tender_task,
            run=run_tender,
            listing=tender_listing,
            event_type="listing_changed",
            title="تمدید مهلت مناقصه آسفالت",
            summary="مهلت ارسال پیشنهاد از ۱۴۰۳/۰۴/۱۶ به ۱۴۰۳/۰۴/۱۸ تغییر کرد.",
            payload={
                "listing": listing_payload(tender_listing),
                "changes": {"send_deadline": {"before": "1403/04/16 - 14:00", "after": tender_listing.send_deadline}},
            },
            minutes_ago=18,
            severity="warning",
        ),
        add_event(
            db,
            task=tender_task,
            run=run_tender,
            listing=tender_listing_2,
            event_type="new_listing",
            title="آگهی جدید نگهداری پل‌ها",
            summary="یک مناقصه جدید با ارزیابی همزمان به پایش اضافه شد.",
            payload={"listing": listing_payload(tender_listing_2)},
            minutes_ago=17,
        ),
        add_event(
            db,
            task=auction_task,
            run=run_auction,
            listing=auction_listing,
            offer=offer_3,
            event_type="offer_new",
            title="پیشنهاد جدید در مزایده کولر",
            summary="یک پیشنهاد تازه با مبلغ ۶۶۰,۰۰۰,۰۰۰ ریال ثبت شد.",
            payload={"listing": listing_payload(auction_listing), "offer": offer_payload(offer_3)},
            minutes_ago=7,
        ),
        add_event(
            db,
            task=auction_task,
            run=run_auction,
            listing=auction_listing,
            offer=offer_1,
            event_type="offer_changed",
            title="تغییر مبلغ پیشنهاد رتبه اول",
            summary="مبلغ پیشنهاد شرکت آذرتهویه سپاهان افزایش پیدا کرد.",
            payload={
                "listing": listing_payload(auction_listing),
                "offer": offer_payload(offer_1),
                "changes": {"amount": {"before": 695000000, "after": offer_1.amount}},
            },
            minutes_ago=6,
            severity="warning",
        ),
        add_event(
            db,
            task=item_task,
            run=run_item,
            listing=vehicle_listing,
            event_type="baseline",
            title="baseline تک‌آگهی خودرو ثبت شد",
            summary="این رکورد برای نمایش حالت پایش تک‌آگهی نگه داشته شده است.",
            payload={"listing": listing_payload(vehicle_listing)},
            minutes_ago=60 * 24 * 3,
        ),
    ]
    db.flush()

    db.add_all(
        [
            NotificationDelivery(event_id=events[0].id, recipient_id=recipient.id, channel="rubika", chat_id=recipient.chat_id, status="sent", attempt_count=1, sent_at=now - timedelta(minutes=17)),
            NotificationDelivery(event_id=events[1].id, recipient_id=recipient.id, channel="rubika", chat_id=recipient.chat_id, status="sent", attempt_count=1, sent_at=now - timedelta(minutes=16)),
            NotificationDelivery(event_id=events[2].id, recipient_id=recipient.id, channel="rubika", chat_id=recipient.chat_id, status="pending", attempt_count=0),
            NotificationDelivery(event_id=events[3].id, recipient_id=recipient.id, channel="rubika", chat_id=recipient.chat_id, status="failed", attempt_count=2, last_error="نمونه خطای ارسال برای بررسی UI"),
        ]
    )
    db.commit()

    return {
        "users": ["demo-operator", "demo-viewer"],
        "password": DEMO_PASSWORD,
        "tasks": len(DEMO_TASK_IDS),
        "listings": 4,
        "offers": 3,
        "events": len(events),
        "viewer_id": viewer.id,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed local SetadInfo demo data.")
    parser.add_argument("--yes", action="store_true", help="confirm that this is a non-production database")
    args = parser.parse_args()

    settings = get_settings()
    if settings.app_env == "production":
        raise SystemExit("Refusing to seed demo data while APP_ENV=production.")
    if not args.yes:
        raise SystemExit("Pass --yes to confirm this is a local/demo database.")

    init_db()
    with SessionLocal() as db:
        result = seed_demo_data(db)

    print("Demo data seeded.")
    print(f"Users: {', '.join(result['users'])}")
    print(f"Password: {result['password']}")
    print(f"Tasks/Listings/Offers/Events: {result['tasks']}/{result['listings']}/{result['offers']}/{result['events']}")


if __name__ == "__main__":
    main()
