"""Notification overhaul fields and audit tables.

Revision ID: 20260715_0002
Revises: 20260627_0001
Create Date: 2026-07-15

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260715_0002"
down_revision = "20260627_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("monitor_tasks", sa.Column("notification_frequency", sa.String(length=40), nullable=False, server_default="immediate"))
    op.add_column("monitor_tasks", sa.Column("notification_event_types", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("monitor_tasks", sa.Column("baseline_captured_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("monitor_tasks", sa.Column("baseline_notification_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("monitor_tasks", sa.Column("consecutive_failure_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("monitor_tasks", sa.Column("last_failure_notified_at", sa.DateTime(timezone=True), nullable=True))

    op.execute("UPDATE notification_events SET event_type = 'baseline_summary' WHERE event_type = 'baseline'")
    op.execute("UPDATE notification_events SET event_type = 'listing_removed' WHERE event_type = 'removed_listing'")
    op.execute("UPDATE notification_events SET event_type = 'listing_new' WHERE event_type = 'new_listing'")

    op.create_table(
        "notification_cards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("card_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["notification_events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["monitor_tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", name="uq_notification_cards_event_id"),
    )
    op.create_index("ix_notification_cards_event_id", "notification_cards", ["event_id"])
    op.create_index("ix_notification_cards_task_id", "notification_cards", ["task_id"])
    op.create_index("ix_notification_cards_task_created", "notification_cards", ["task_id", "created_at"])

    op.create_table(
        "notification_delivery_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("delivery_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("error", sa.Text(), nullable=False),
        sa.Column("response_payload", sa.JSON(), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["delivery_id"], ["notification_deliveries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_delivery_attempts_delivery", "notification_delivery_attempts", ["delivery_id"])
    op.create_index("ix_notification_delivery_attempts_delivery_id", "notification_delivery_attempts", ["delivery_id"])


def downgrade() -> None:
    op.drop_index("ix_notification_delivery_attempts_delivery_id", table_name="notification_delivery_attempts")
    op.drop_index("ix_notification_delivery_attempts_delivery", table_name="notification_delivery_attempts")
    op.drop_table("notification_delivery_attempts")
    op.drop_index("ix_notification_cards_task_created", table_name="notification_cards")
    op.drop_index("ix_notification_cards_task_id", table_name="notification_cards")
    op.drop_index("ix_notification_cards_event_id", table_name="notification_cards")
    op.drop_table("notification_cards")
    op.drop_column("monitor_tasks", "last_failure_notified_at")
    op.drop_column("monitor_tasks", "consecutive_failure_count")
    op.drop_column("monitor_tasks", "baseline_notification_sent_at")
    op.drop_column("monitor_tasks", "baseline_captured_at")
    op.drop_column("monitor_tasks", "notification_event_types")
    op.drop_column("monitor_tasks", "notification_frequency")
