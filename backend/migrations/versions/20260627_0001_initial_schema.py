"""Initial schema.

Revision ID: 20260627_0001
Revises:
Create Date: 2026-06-27

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260627_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("username", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=240), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )

    op.create_table(
        "monitor_tasks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("interval_minutes", sa.Integer(), nullable=False),
        sa.Column("filters", sa.JSON(), nullable=False),
        sa.Column("include_offers", sa.Boolean(), nullable=False),
        sa.Column("notify_rubika", sa.Boolean(), nullable=False),
        sa.Column("notify_initial", sa.Boolean(), nullable=False),
        sa.Column("notify_new_listings", sa.Boolean(), nullable=False),
        sa.Column("notify_listing_changes", sa.Boolean(), nullable=False),
        sa.Column("notify_offer_changes", sa.Boolean(), nullable=False),
        sa.Column("rubika_chat_id", sa.String(length=120), nullable=False),
        sa.Column("owner_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("baseline_notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_successful_run_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_monitor_tasks_owner_id", "monitor_tasks", ["owner_id"])

    op.create_table(
        "rubika_recipients",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("recipient_type", sa.String(length=20), nullable=False),
        sa.Column("chat_id", sa.String(length=160), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chat_id", name="uq_rubika_recipients_chat_id"),
    )

    op.create_table(
        "monitor_task_recipients",
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("recipient_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["recipient_id"], ["rubika_recipients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["monitor_tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("task_id", "recipient_id"),
    )

    op.create_table(
        "task_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("fetched_count", sa.Integer(), nullable=False),
        sa.Column("matched_count", sa.Integer(), nullable=False),
        sa.Column("changed_count", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["monitor_tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_runs_task_id", "task_runs", ["task_id"])

    op.create_table(
        "listings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_key", sa.String(length=160), nullable=False),
        sa.Column("trade_number", sa.String(length=120), nullable=False),
        sa.Column("board_code", sa.Integer(), nullable=True),
        sa.Column("tag_code", sa.Integer(), nullable=True),
        sa.Column("party_number", sa.String(length=120), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("organization", sa.Text(), nullable=False),
        sa.Column("province", sa.String(length=120), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=240), nullable=False),
        sa.Column("send_deadline", sa.String(length=80), nullable=False),
        sa.Column("document_deadline", sa.String(length=80), nullable=False),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("detail_url", sa.Text(), nullable=False),
        sa.Column("raw", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_key", name="uq_listings_source_key"),
    )
    op.create_index("ix_listings_last_seen", "listings", ["last_seen_at"])
    op.create_index("ix_listings_title", "listings", ["title"])

    op.create_table(
        "task_matches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["monitor_tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "listing_id", name="uq_task_listing"),
    )
    op.create_index("ix_task_matches_last_seen", "task_matches", ["last_seen_at"])
    op.create_index("ix_task_matches_listing_id", "task_matches", ["listing_id"])
    op.create_index("ix_task_matches_task_id", "task_matches", ["task_id"])

    op.create_table(
        "offers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("source_key", sa.String(length=220), nullable=False),
        sa.Column("bidder_name", sa.Text(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("submitted_at", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=120), nullable=False),
        sa.Column("rank", sa.String(length=80), nullable=False),
        sa.Column("raw", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "source_key", name="uq_listing_offer_source_key"),
    )
    op.create_index("ix_offers_listing", "offers", ["listing_id"])
    op.create_index("ix_offers_listing_id", "offers", ["listing_id"])

    op.create_table(
        "notification_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=True),
        sa.Column("listing_id", sa.Integer(), nullable=True),
        sa.Column("offer_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=240), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["offer_id"], ["offers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["run_id"], ["task_runs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_id"], ["monitor_tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key", name="uq_notification_events_dedupe_key"),
    )
    op.create_index("ix_notification_events_listing_id", "notification_events", ["listing_id"])
    op.create_index("ix_notification_events_offer_id", "notification_events", ["offer_id"])
    op.create_index("ix_notification_events_run", "notification_events", ["run_id"])
    op.create_index("ix_notification_events_run_id", "notification_events", ["run_id"])
    op.create_index("ix_notification_events_task_created", "notification_events", ["task_id", "created_at"])
    op.create_index("ix_notification_events_task_id", "notification_events", ["task_id"])

    op.create_table(
        "notification_deliveries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("recipient_id", sa.String(length=36), nullable=True),
        sa.Column("channel", sa.String(length=40), nullable=False),
        sa.Column("chat_id", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["notification_events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_id"], ["rubika_recipients.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_deliveries_event", "notification_deliveries", ["event_id"])
    op.create_index("ix_notification_deliveries_event_id", "notification_deliveries", ["event_id"])
    op.create_index("ix_notification_deliveries_recipient", "notification_deliveries", ["recipient_id"])
    op.create_index("ix_notification_deliveries_recipient_id", "notification_deliveries", ["recipient_id"])


def downgrade() -> None:
    op.drop_index("ix_notification_deliveries_recipient_id", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_recipient", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_event_id", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_event", table_name="notification_deliveries")
    op.drop_table("notification_deliveries")

    op.drop_index("ix_notification_events_task_id", table_name="notification_events")
    op.drop_index("ix_notification_events_task_created", table_name="notification_events")
    op.drop_index("ix_notification_events_run_id", table_name="notification_events")
    op.drop_index("ix_notification_events_run", table_name="notification_events")
    op.drop_index("ix_notification_events_offer_id", table_name="notification_events")
    op.drop_index("ix_notification_events_listing_id", table_name="notification_events")
    op.drop_table("notification_events")

    op.drop_index("ix_offers_listing_id", table_name="offers")
    op.drop_index("ix_offers_listing", table_name="offers")
    op.drop_table("offers")

    op.drop_index("ix_task_matches_task_id", table_name="task_matches")
    op.drop_index("ix_task_matches_listing_id", table_name="task_matches")
    op.drop_index("ix_task_matches_last_seen", table_name="task_matches")
    op.drop_table("task_matches")

    op.drop_index("ix_listings_title", table_name="listings")
    op.drop_index("ix_listings_last_seen", table_name="listings")
    op.drop_table("listings")

    op.drop_index("ix_task_runs_task_id", table_name="task_runs")
    op.drop_table("task_runs")

    op.drop_table("monitor_task_recipients")
    op.drop_table("rubika_recipients")
    op.drop_index("ix_monitor_tasks_owner_id", table_name="monitor_tasks")
    op.drop_table("monitor_tasks")
    op.drop_table("users")
