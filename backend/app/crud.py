from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Listing, MonitorTask, NotificationEvent, Offer, TaskMatch, TaskRun
from .setad_client import (
    SetadClient,
    SetadRateLimitError,
    SetadUpstreamError,
    normalize_raw_source,
    parse_price,
    pick_text,
)


settings = get_settings()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def serialize_task(task: MonitorTask) -> dict[str, Any]:
    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "enabled": task.enabled,
        "interval_minutes": task.interval_minutes,
        "include_offers": task.include_offers,
        "notify_rubika": task.notify_rubika,
        "notify_initial": task.notify_initial,
        "notify_new_listings": task.notify_new_listings,
        "notify_listing_changes": task.notify_listing_changes,
        "notify_offer_changes": task.notify_offer_changes,
        "rubika_chat_id": task.rubika_chat_id,
        "recipient_ids": [recipient.id for recipient in task.recipients],
        "owner_id": task.owner_id,
        "filters": task.filters,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "last_run_at": task.last_run_at,
        "next_run_at": task.next_run_at,
        "baseline_notified_at": task.baseline_notified_at,
        "last_successful_run_id": task.last_successful_run_id,
    }


def listing_to_dict(listing: Listing) -> dict[str, Any]:
    return {
        "id": listing.id,
        "source_key": listing.source_key,
        "trade_number": listing.trade_number,
        "board_code": listing.board_code,
        "tag_code": listing.tag_code,
        "party_number": listing.party_number,
        "title": listing.title,
        "description": listing.description,
        "organization": listing.organization,
        "province": listing.province,
        "city": listing.city,
        "category": listing.category,
        "send_deadline": listing.send_deadline,
        "document_deadline": listing.document_deadline,
        "price": listing.price,
        "detail_url": listing.detail_url,
        "raw": listing.raw,
        "content_hash": listing.content_hash,
        "first_seen_at": listing.first_seen_at,
        "last_seen_at": listing.last_seen_at,
    }


def offer_to_dict(offer: Offer) -> dict[str, Any]:
    return {
        "id": offer.id,
        "listing_id": offer.listing_id,
        "source_key": offer.source_key,
        "bidder_name": offer.bidder_name,
        "amount": offer.amount,
        "submitted_at": offer.submitted_at,
        "status": offer.status,
        "rank": offer.rank,
        "raw": offer.raw,
        "content_hash": offer.content_hash,
        "first_seen_at": offer.first_seen_at,
        "last_seen_at": offer.last_seen_at,
    }


def notification_event_to_dict(event: NotificationEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "task_id": event.task_id,
        "run_id": event.run_id,
        "listing_id": event.listing_id,
        "offer_id": event.offer_id,
        "event_type": event.event_type,
        "severity": event.severity,
        "title": event.title,
        "summary": event.summary,
        "payload": event.payload,
        "created_at": event.created_at,
    }


def listing_event_payload(listing: Listing) -> dict[str, Any]:
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


def offer_event_payload(offer: Offer, listing: Listing) -> dict[str, Any]:
    return {
        "listing": listing_event_payload(listing),
        "offer": {
            "source_key": offer.source_key,
            "bidder_name": offer.bidder_name,
            "amount": offer.amount,
            "submitted_at": offer.submitted_at,
            "status": offer.status,
            "rank": offer.rank,
            "content_hash": offer.content_hash,
        },
    }


def create_notification_event(
    db: Session,
    *,
    task: MonitorTask,
    run: TaskRun,
    event_type: str,
    title: str,
    summary: str,
    payload: dict[str, Any],
    listing: Listing | None = None,
    offer: Offer | None = None,
    dedupe_suffix: str,
    severity: str = "info",
) -> NotificationEvent | None:
    dedupe_key = f"{task.id}:{event_type}:{dedupe_suffix}"
    existing = db.scalar(select(NotificationEvent).where(NotificationEvent.dedupe_key == dedupe_key))
    if existing:
        return None
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
        dedupe_key=dedupe_key,
    )
    db.add(event)
    return event


def format_money(value: float | None) -> str:
    if value in (None, ""):
        return "-"
    try:
        return f"{float(value):,.0f}"
    except (TypeError, ValueError):
        return str(value)


def render_event_card(event: NotificationEvent) -> str:
    payload = event.payload or {}
    listing = payload.get("listing") if isinstance(payload.get("listing"), dict) else payload
    offer = payload.get("offer") if isinstance(payload.get("offer"), dict) else None
    lines = [f"■ {event.title}"]
    if listing:
        lines.extend(
            [
                f"شماره: {listing.get('trade_number') or '-'}",
                f"عنوان: {listing.get('title') or '-'}",
                f"سازمان: {listing.get('organization') or '-'}",
                f"محل: {' / '.join(str(v) for v in (listing.get('province'), listing.get('city')) if v) or '-'}",
                f"مهلت ارسال: {listing.get('send_deadline') or '-'}",
                f"قیمت پایه: {format_money(listing.get('price'))}",
            ]
        )
    if offer:
        lines.extend(
            [
                f"پیشنهاددهنده: {offer.get('bidder_name') or '-'}",
                f"مبلغ پیشنهاد: {format_money(offer.get('amount'))}",
                f"زمان ثبت: {offer.get('submitted_at') or '-'}",
                f"وضعیت/رتبه: {offer.get('status') or '-'} / {offer.get('rank') or '-'}",
            ]
        )
    if event.summary:
        lines.append(event.summary)
    return "\n".join(lines)


def render_notification_digest(task: MonitorTask, run: TaskRun, events: list[NotificationEvent], *, max_cards: int = 6) -> str:
    baseline_count = sum(1 for event in events if event.event_type == "baseline")
    new_count = sum(1 for event in events if event.event_type == "listing_new")
    changed_count = sum(1 for event in events if event.event_type == "listing_changed")
    removed_count = sum(1 for event in events if event.event_type == "listing_removed")
    offer_count = sum(1 for event in events if event.event_type in {"offer_new", "offer_changed"})
    header = [
        f"SetadInfo | {task.name}",
        f"اجرا #{run.id}",
        f"اولیه: {baseline_count} | جدید: {new_count} | تغییر: {changed_count} | حذف: {removed_count} | پیشنهاد: {offer_count}",
    ]
    visible_events = events[:max_cards]
    cards = [render_event_card(event) for event in visible_events]
    if len(events) > max_cards:
        cards.append(f"و {len(events) - max_cards} مورد دیگر در داشبورد SetadInfo.")
    return "\n\n".join(["\n".join(header), *cards])


def cleanup_orphan_listings(db: Session) -> int:
    orphan_ids = select(Listing.id).where(
        ~select(TaskMatch.id).where(TaskMatch.listing_id == Listing.id).exists()
    )
    ids = list(db.scalars(orphan_ids).all())
    if not ids:
        return 0
    db.execute(delete(Offer).where(Offer.listing_id.in_(ids)))
    db.execute(delete(Listing).where(Listing.id.in_(ids)))
    return len(ids)


def stored_listings_page(
    db: Session,
    *,
    page: int = 0,
    page_size: int = 25,
    task_id: str | None = None,
    owner_id: str | None = None,
    q: str = "",
    board_code: int | None = None,
    sort_by: str = "last_seen_at",
    sort_dir: str = "desc",
) -> dict[str, Any]:
    match_exists = select(TaskMatch.id).where(TaskMatch.listing_id == Listing.id)
    if task_id:
        match_exists = match_exists.where(TaskMatch.task_id == task_id)
    if owner_id:
        match_exists = match_exists.join(MonitorTask, MonitorTask.id == TaskMatch.task_id).where(MonitorTask.owner_id == owner_id)
    stmt = select(Listing).where(match_exists.exists())
    if q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            Listing.title.ilike(like)
            | Listing.organization.ilike(like)
            | Listing.trade_number.ilike(like)
            | Listing.description.ilike(like)
        )
    if board_code is not None:
        stmt = stmt.where(Listing.board_code == board_code)

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Listing.id).order_by(None).subquery())) or 0
    sort_columns = {
        "last_seen_at": Listing.last_seen_at,
        "trade_number": Listing.trade_number,
        "title": Listing.title,
        "organization": Listing.organization,
        "send_deadline": Listing.send_deadline,
        "price": Listing.price,
    }
    sort_column = sort_columns.get(sort_by, Listing.last_seen_at)
    order = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
    items = list(
        db.scalars(
            stmt.order_by(order, Listing.id.asc())
            .offset(page * page_size)
            .limit(page_size)
        ).all()
    )
    return {
        "items": [listing_to_dict(item) for item in items],
        "page": page,
        "page_size": page_size,
        "total_elements": total,
        "total_pages": (total + page_size - 1) // page_size,
    }


def fingerprint_listing(item: dict[str, Any]) -> str:
    return hashlib.sha256(repr(sorted(item.items())).encode("utf-8", "ignore")).hexdigest()


def normalize_listing(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_key": normalize_raw_source(item)[0],
        "trade_number": pick_text(item, "number", "tradeNumber", "tradeNo"),
        "board_code": int(item["boardCode"]) if str(item.get("boardCode", "")).isdigit() else item.get("boardCode"),
        "tag_code": int(item["tagCode"]) if str(item.get("tagCode", "")).isdigit() else item.get("tagCode"),
        "party_number": pick_text(item, "partyNumber", "partyNo"),
        "title": pick_text(item, "title", "description", "subject", "name"),
        "description": pick_text(item, "description", "summary", "content", "subject"),
        "organization": pick_text(item, "organizationName", "orgName", "ownerName"),
        "province": pick_text(item, "provinceName", "province", "stateName"),
        "city": pick_text(item, "cityName", "city", "countyName"),
        "category": pick_text(item, "categoryName", "category", "setadCategoryName"),
        "send_deadline": pick_text(item, "jalaliSendDeadlineDate", "jalaliSendDeadLineDate", "sendDeadlineDate", "sendDeadline"),
        "document_deadline": pick_text(item, "jalaliDocumentDeadlineDate", "documentDeadlineDate", "documentDeadline"),
        "price": parse_price(item.get("basePrice") or item.get("price") or item.get("startingPrice")),
        "detail_url": pick_text(item, "url", "link", "detailUrl"),
        "content_hash": fingerprint_listing(item),
    }


def normalize_offer(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "bidder_name": pick_text(item, "supplierName", "bidderName", "companyName", "name"),
        "amount": parse_price(item.get("proposalPrice") or item.get("amount") or item.get("price")),
        "submitted_at": pick_text(item, "responseDate", "submitDate", "date", "createdAt"),
        "status": pick_text(item, "status", "state"),
        "rank": pick_text(item, "rank", "order"),
    }


def transient_listing_to_dict(item: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_listing(item)
    return {
        **normalized,
        "id": normalized["source_key"],
        "raw": item,
        "first_seen_at": None,
        "last_seen_at": None,
    }


async def fetch_live_results(
    filters: dict[str, Any],
    page_number: int,
    page_size: int,
    client: SetadClient | None = None,
) -> dict[str, Any]:
    from .filters import (
        build_setad_params,
        listing_matches_filters,
        normalized_excluded_keywords,
        normalized_keywords,
    )

    setad = client or SetadClient()
    keywords = normalized_keywords(filters)
    excluded_keywords = normalized_excluded_keywords(filters)
    requires_full_title_filter = int(filters.get("searchTypeCode", 0)) == 0 and bool(
        keywords or excluded_keywords
    )

    if requires_full_title_filter:
        snapshot_value = {"filters": filters}
        snapshot = await setad.read_snapshot("strict-live-search", snapshot_value) if isinstance(setad, SetadClient) else None
        if snapshot:
            matching_items = list(snapshot.get("items") or [])
            source_status = str(snapshot.get("_setad_cache") or "fresh")
        else:
            try:
                scan_page_size = 100
                first_payload = await setad.list_cards(build_setad_params(filters, 0, scan_page_size))
                raw_items = list(first_payload.get("content") or first_payload.get("data") or [])
                source_statuses = {str(first_payload.get("_setad_cache") or "live")}
                upstream_pages = int(first_payload.get("totalPages") or (1 if raw_items else 0))
                for upstream_page in range(1, upstream_pages):
                    payload = await setad.list_cards(build_setad_params(filters, upstream_page, scan_page_size))
                    source_statuses.add(str(payload.get("_setad_cache") or "live"))
                    raw_items.extend(payload.get("content") or payload.get("data") or [])
                matching_items = []
                for raw_item in raw_items:
                    item = transient_listing_to_dict(raw_item)
                    if listing_matches_filters(item, filters):
                        matching_items.append(item)
                source_status = "stale" if "stale" in source_statuses else "fresh" if "fresh" in source_statuses else "live"
                if isinstance(setad, SetadClient):
                    await setad.write_snapshot(
                        "strict-live-search",
                        snapshot_value,
                        {"items": matching_items},
                    )
            except (SetadRateLimitError, SetadUpstreamError):
                stale_snapshot = (
                    await setad.read_snapshot("strict-live-search", snapshot_value, stale=True)
                    if isinstance(setad, SetadClient)
                    else None
                )
                if not stale_snapshot:
                    raise
                matching_items = list(stale_snapshot.get("items") or [])
                source_status = "stale"
        total_elements = len(matching_items)
        total_pages = (total_elements + page_size - 1) // page_size
        start = page_number * page_size
        items = matching_items[start : start + page_size]
        return {
            "items": items,
            "page": page_number,
            "page_size": page_size,
            "total_elements": total_elements,
            "total_pages": total_pages,
            "source_status": source_status,
        }

    payload = await setad.list_cards(build_setad_params(filters, page_number, page_size))
    content = payload.get("content") or payload.get("data") or []
    items = [transient_listing_to_dict(item) for item in content]
    if filters.get("monitorMode") == "item":
        items = [item for item in items if listing_matches_filters(item, filters)]
    return {
        "items": items,
        "page": page_number,
        "page_size": page_size,
        "total_elements": payload.get("totalElements", len(items)),
        "total_pages": payload.get("totalPages", 1 if items else 0),
        "source_status": payload.get("_setad_cache", "live"),
    }


async def fetch_live_offers(
    party_number: str,
    board_code: int,
    tag_code: int,
    client: SetadClient | None = None,
) -> list[dict[str, Any]]:
    setad = client or SetadClient()
    raw_offers = await fetch_all_offer_history(
        setad,
        party_number,
        board_code,
        tag_code,
        settings.setad_max_pages_per_run,
    )
    result = []
    for index, item in enumerate(raw_offers):
        result.append(
            {
                "id": str(item.get("id") or item.get("rowId") or item.get("supplierId") or index),
                **normalize_offer(item),
                "raw": item,
            }
        )
    return result


async def fetch_all_offer_history(
    client: SetadClient,
    party_number: str,
    board_code: int,
    tag_code: int,
    max_pages: int,
) -> list[dict[str, Any]]:
    offers: list[dict[str, Any]] = []
    page_size = 10
    for page_number in range(max_pages):
        payload = await client.offer_history(
            party_number,
            board_code,
            tag_code,
            page_number=page_number,
            page_size=page_size,
        )
        content = payload.get("content") or payload.get("data") or []
        offers.extend(content)
        if len(content) < page_size:
            break
    return offers


def upsert_offer(
    db: Session,
    listing: Listing,
    listing_source_key: str,
    offer_item: dict[str, Any],
) -> bool:
    normalized = normalize_offer(offer_item)
    offer_source = ":".join(
        [
            listing_source_key,
            str(
                offer_item.get("id")
                or offer_item.get("rowId")
                or offer_item.get("supplierId")
                or normalized["bidder_name"]
            ),
        ]
    )
    offer_hash = fingerprint_listing(offer_item)
    offer = db.scalar(select(Offer).where(Offer.listing_id == listing.id, Offer.source_key == offer_source))
    if not offer:
        db.add(
            Offer(
                listing_id=listing.id,
                source_key=offer_source,
                raw=offer_item,
                content_hash=offer_hash,
                first_seen_at=utcnow(),
                last_seen_at=utcnow(),
                **normalized,
            )
        )
        return True

    changed = offer.content_hash != offer_hash
    for key, value in normalized.items():
        setattr(offer, key, value)
    offer.raw = offer_item
    offer.content_hash = offer_hash
    offer.last_seen_at = utcnow()
    return changed


def task_next_run(task: MonitorTask) -> datetime:
    return utcnow() if not task.next_run_at else task.next_run_at


async def ingest_task_run(db: Session, task: MonitorTask) -> TaskRun:
    from .filters import build_setad_params, listing_matches_filters

    run = TaskRun(task_id=task.id, status="running", started_at=utcnow())
    db.add(run)
    db.flush()

    client = SetadClient()
    fetched = 0
    matched = 0
    changed = 0
    pages = 0
    seen_sources: set[str] = set()
    latest_payloads: list[dict[str, Any]] = []
    first_successful_run = task.last_successful_run_id is None

    try:
        while pages < settings.setad_max_pages_per_run:
            params = build_setad_params(task.filters, page_number=pages, page_size=settings.setad_page_size)
            payload = await client.list_cards(params)
            content = payload.get("content") or payload.get("data") or []
            if not content:
                break
            latest_payloads.extend(content)
            fetched += len(content)
            pages += 1
            if len(content) < settings.setad_page_size:
                break

        for item in latest_payloads:
            normalized = normalize_listing(item)
            if not listing_matches_filters(normalized, task.filters):
                continue
            source_key = normalized["source_key"]
            seen_sources.add(source_key)
            listing = db.scalar(select(Listing).where(Listing.source_key == source_key))
            listing_was_new = listing is None
            listing_changed = False
            if not listing:
                normalized_without_source = {key: value for key, value in normalized.items() if key != "source_key"}
                listing = Listing(
                    source_key=source_key,
                    raw=item,
                    first_seen_at=utcnow(),
                    last_seen_at=utcnow(),
                    **normalized_without_source,
                )
                db.add(listing)
                db.flush()
                changed += 1
            else:
                if listing.content_hash != normalized["content_hash"]:
                    changed += 1
                    listing_changed = True
                for key, value in normalized.items():
                    setattr(listing, key, value)
                listing.raw = item
                listing.last_seen_at = utcnow()
            match = db.scalar(select(TaskMatch).where(TaskMatch.task_id == task.id, TaskMatch.listing_id == listing.id))
            if not match:
                match = TaskMatch(task_id=task.id, listing_id=listing.id, first_seen_at=utcnow(), last_seen_at=utcnow())
                db.add(match)
            else:
                match.last_seen_at = utcnow()
            matched += 1

            if first_successful_run and task.notify_initial:
                create_notification_event(
                    db,
                    task=task,
                    run=run,
                    event_type="baseline",
                    title=listing.title or listing.trade_number or "آگهی پایش",
                    summary="در فهرست اولیه پایش ثبت شد.",
                    payload=listing_event_payload(listing),
                    listing=listing,
                    dedupe_suffix=source_key,
                )
            elif listing_was_new and task.notify_new_listings:
                create_notification_event(
                    db,
                    task=task,
                    run=run,
                    event_type="listing_new",
                    title=listing.title or listing.trade_number or "آگهی جدید",
                    summary="مورد جدید با فیلتر پایش منطبق شد.",
                    payload=listing_event_payload(listing),
                    listing=listing,
                    dedupe_suffix=source_key,
                    severity="success",
                )
            elif listing_changed and task.notify_listing_changes:
                create_notification_event(
                    db,
                    task=task,
                    run=run,
                    event_type="listing_changed",
                    title=listing.title or listing.trade_number or "تغییر آگهی",
                    summary="اطلاعات عمومی این آگهی نسبت به مشاهده قبلی تغییر کرده است.",
                    payload=listing_event_payload(listing),
                    listing=listing,
                    dedupe_suffix=f"{source_key}:{listing.content_hash}",
                    severity="warning",
                )

            if task.include_offers and int(item.get("boardCode") or 0) == 3 and int(item.get("tagCode") or 0) in (341, 342, 343) and item.get("partyNumber"):
                offers = await fetch_all_offer_history(
                    client,
                    str(item.get("partyNumber")),
                    int(item.get("boardCode") or 3),
                    int(item.get("tagCode") or 0),
                    settings.setad_max_pages_per_run,
                )
                for offer_item in offers:
                    normalized_offer = normalize_offer(offer_item)
                    offer_source = ":".join(
                        [
                            source_key,
                            str(
                                offer_item.get("id")
                                or offer_item.get("rowId")
                                or offer_item.get("supplierId")
                                or normalized_offer["bidder_name"]
                            ),
                        ]
                    )
                    existing_offer = db.scalar(select(Offer.id).where(Offer.listing_id == listing.id, Offer.source_key == offer_source))
                    offer_changed = upsert_offer(db, listing, source_key, offer_item)
                    if offer_changed:
                        changed += 1
                        db.flush()
                        offer = db.scalar(select(Offer).where(Offer.listing_id == listing.id, Offer.source_key == offer_source))
                        if offer and task.notify_offer_changes and not first_successful_run:
                            create_notification_event(
                                db,
                                task=task,
                                run=run,
                                event_type="offer_changed" if existing_offer else "offer_new",
                                title=f"پیشنهاد مزایده برای {listing.trade_number or listing.title}",
                                summary="پیشنهاد عمومی مزایده تغییر کرده است.",
                                payload=offer_event_payload(offer, listing),
                                listing=listing,
                                offer=offer,
                                dedupe_suffix=f"{offer.source_key}:{offer.content_hash}",
                                severity="success",
                            )

        if not first_successful_run:
            previous_matches = db.scalars(
                select(TaskMatch)
                .join(Listing, Listing.id == TaskMatch.listing_id)
                .where(TaskMatch.task_id == task.id)
            ).all()
            for previous_match in previous_matches:
                listing = db.get(Listing, previous_match.listing_id)
                if listing and listing.source_key not in seen_sources and task.notify_listing_changes:
                    create_notification_event(
                        db,
                        task=task,
                        run=run,
                        event_type="listing_removed",
                        title=listing.title or listing.trade_number or "خروج از نتایج پایش",
                        summary="این مورد در اجرای جدید در نتایج Setad دیده نشد.",
                        payload=listing_event_payload(listing),
                        listing=listing,
                        dedupe_suffix=listing.source_key,
                        severity="warning",
                    )

        task.last_run_at = utcnow()
        run.status = "success"
        run.message = f"fetched={fetched}, matched={matched}, changed={changed}"
        run.fetched_count = fetched
        run.matched_count = matched
        run.changed_count = changed
        task.last_successful_run_id = run.id
        if first_successful_run:
            task.baseline_notified_at = utcnow()
        return run
    except Exception as exc:
        run.status = "error"
        run.message = str(exc)
        raise
    finally:
        run.finished_at = utcnow()


def refresh_task_schedule(task: MonitorTask) -> None:
    if not task.enabled:
        task.next_run_at = None
        return
    task.next_run_at = utcnow().replace(microsecond=0) + timedelta(minutes=task.interval_minutes)


def schedule_task(task: MonitorTask) -> None:
    if not task.enabled:
        task.next_run_at = None
        return
    task.next_run_at = utcnow().replace(microsecond=0) + timedelta(minutes=task.interval_minutes)


def due_tasks(db: Session) -> list[MonitorTask]:
    now = utcnow()
    stmt = select(MonitorTask).where(MonitorTask.enabled.is_(True)).order_by(MonitorTask.next_run_at.asc().nullsfirst())
    return [task for task in db.scalars(stmt).all() if task.next_run_at is None or task.next_run_at <= now]


def task_stats(db: Session) -> dict[str, Any]:
    total_tasks = db.scalar(select(func.count()).select_from(MonitorTask)) or 0
    enabled_tasks = db.scalar(select(func.count()).select_from(MonitorTask).where(MonitorTask.enabled.is_(True))) or 0
    total_listings = db.scalar(select(func.count(func.distinct(TaskMatch.listing_id)))) or 0
    total_runs = db.scalar(select(func.count()).select_from(TaskRun)) or 0
    last_run = db.scalar(select(TaskRun).order_by(desc(TaskRun.started_at)).limit(1))
    return {
        "total_tasks": total_tasks,
        "enabled_tasks": enabled_tasks,
        "total_listings": total_listings,
        "total_runs": total_runs,
        "last_run": last_run.started_at if last_run else None,
    }
