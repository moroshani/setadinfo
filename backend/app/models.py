from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("username", name="uq_users_username"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(240), default="")
    role: Mapped[str] = mapped_column(String(40), default="viewer")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


monitor_task_recipients = Table(
    "monitor_task_recipients",
    Base.metadata,
    Column("task_id", ForeignKey("monitor_tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("recipient_id", ForeignKey("rubika_recipients.id", ondelete="CASCADE"), primary_key=True),
)


class MonitorTask(Base):
    __tablename__ = "monitor_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    filters: Mapped[dict] = mapped_column(JSON, default=dict)
    include_offers: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_rubika: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_initial: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_new_listings: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_listing_changes: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_offer_changes: Mapped[bool] = mapped_column(Boolean, default=True)
    rubika_chat_id: Mapped[str] = mapped_column(String(120), default="")
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    baseline_notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_successful_run_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    runs: Mapped[list["TaskRun"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    recipients: Mapped[list["RubikaRecipient"]] = relationship(
        secondary=monitor_task_recipients,
        back_populates="tasks",
    )


class RubikaRecipient(Base):
    __tablename__ = "rubika_recipients"
    __table_args__ = (UniqueConstraint("chat_id", name="uq_rubika_recipients_chat_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    recipient_type: Mapped[str] = mapped_column(String(20), nullable=False)
    chat_id: Mapped[str] = mapped_column(String(160), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    tasks: Mapped[list[MonitorTask]] = relationship(
        secondary=monitor_task_recipients,
        back_populates="recipients",
    )


class TaskRun(Base):
    __tablename__ = "task_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("monitor_tasks.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="running")
    message: Mapped[str] = mapped_column(Text, default="")
    fetched_count: Mapped[int] = mapped_column(Integer, default=0)
    matched_count: Mapped[int] = mapped_column(Integer, default=0)
    changed_count: Mapped[int] = mapped_column(Integer, default=0)

    task: Mapped[MonitorTask] = relationship(back_populates="runs")


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        UniqueConstraint("source_key", name="uq_listings_source_key"),
        Index("ix_listings_title", "title"),
        Index("ix_listings_last_seen", "last_seen_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_key: Mapped[str] = mapped_column(String(160), nullable=False)
    trade_number: Mapped[str] = mapped_column(String(120), default="")
    board_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tag_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    party_number: Mapped[str] = mapped_column(String(120), default="")
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    organization: Mapped[str] = mapped_column(Text, default="")
    province: Mapped[str] = mapped_column(String(120), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    category: Mapped[str] = mapped_column(String(240), default="")
    send_deadline: Mapped[str] = mapped_column(String(80), default="")
    document_deadline: Mapped[str] = mapped_column(String(80), default="")
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    detail_url: Mapped[str] = mapped_column(Text, default="")
    raw: Mapped[dict] = mapped_column(JSON, default=dict)
    content_hash: Mapped[str] = mapped_column(String(64), default="")
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    offers: Mapped[list["Offer"]] = relationship(back_populates="listing", cascade="all, delete-orphan")


class TaskMatch(Base):
    __tablename__ = "task_matches"
    __table_args__ = (
        UniqueConstraint("task_id", "listing_id", name="uq_task_listing"),
        Index("ix_task_matches_last_seen", "last_seen_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("monitor_tasks.id", ondelete="CASCADE"), index=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Offer(Base):
    __tablename__ = "offers"
    __table_args__ = (
        UniqueConstraint("listing_id", "source_key", name="uq_listing_offer_source_key"),
        Index("ix_offers_listing", "listing_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    source_key: Mapped[str] = mapped_column(String(220), nullable=False)
    bidder_name: Mapped[str] = mapped_column(Text, default="")
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    submitted_at: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(120), default="")
    rank: Mapped[str] = mapped_column(String(80), default="")
    raw: Mapped[dict] = mapped_column(JSON, default=dict)
    content_hash: Mapped[str] = mapped_column(String(64), default="")
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    listing: Mapped[Listing] = relationship(back_populates="offers")


class NotificationEvent(Base):
    __tablename__ = "notification_events"
    __table_args__ = (
        UniqueConstraint("dedupe_key", name="uq_notification_events_dedupe_key"),
        Index("ix_notification_events_task_created", "task_id", "created_at"),
        Index("ix_notification_events_run", "run_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("monitor_tasks.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[int | None] = mapped_column(ForeignKey("task_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id", ondelete="SET NULL"), nullable=True, index=True)
    offer_id: Mapped[int | None] = mapped_column(ForeignKey("offers.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="info")
    title: Mapped[str] = mapped_column(Text, default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    dedupe_key: Mapped[str] = mapped_column(String(240), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"
    __table_args__ = (
        Index("ix_notification_deliveries_event", "event_id"),
        Index("ix_notification_deliveries_recipient", "recipient_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("notification_events.id", ondelete="CASCADE"), index=True)
    recipient_id: Mapped[str | None] = mapped_column(ForeignKey("rubika_recipients.id", ondelete="SET NULL"), nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(40), default="rubika")
    chat_id: Mapped[str] = mapped_column(String(160), default="")
    status: Mapped[str] = mapped_column(String(40), default="pending")
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str] = mapped_column(Text, default="")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
