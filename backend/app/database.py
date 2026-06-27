from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

if settings.database_url.startswith("sqlite"):
    Path("data").mkdir(exist_ok=True)
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    from . import models
    from .auth import hash_password

    Base.metadata.create_all(bind=engine)
    columns = {column["name"] for column in inspect(engine).get_columns("monitor_tasks")}
    with engine.begin() as connection:
        if "owner_id" not in columns:
            connection.execute(text("ALTER TABLE monitor_tasks ADD COLUMN owner_id VARCHAR(36)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_monitor_tasks_owner_id ON monitor_tasks (owner_id)"))
        if "notify_initial" not in columns:
            connection.execute(text("ALTER TABLE monitor_tasks ADD COLUMN notify_initial BOOLEAN DEFAULT TRUE"))
        if "notify_new_listings" not in columns:
            connection.execute(text("ALTER TABLE monitor_tasks ADD COLUMN notify_new_listings BOOLEAN DEFAULT TRUE"))
        if "notify_listing_changes" not in columns:
            connection.execute(text("ALTER TABLE monitor_tasks ADD COLUMN notify_listing_changes BOOLEAN DEFAULT TRUE"))
        if "notify_offer_changes" not in columns:
            connection.execute(text("ALTER TABLE monitor_tasks ADD COLUMN notify_offer_changes BOOLEAN DEFAULT TRUE"))
        if "baseline_notified_at" not in columns:
            connection.execute(text("ALTER TABLE monitor_tasks ADD COLUMN baseline_notified_at TIMESTAMP"))
        if "last_successful_run_id" not in columns:
            connection.execute(text("ALTER TABLE monitor_tasks ADD COLUMN last_successful_run_id INTEGER"))

    with SessionLocal() as db:
        admin = db.scalar(select(models.User).where(models.User.username == settings.admin_username))
        if not admin:
            admin = models.User(
                username=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
                role="admin",
                enabled=True,
            )
            db.add(admin)
            db.flush()
        db.query(models.MonitorTask).filter(models.MonitorTask.owner_id.is_(None)).update(
            {models.MonitorTask.owner_id: admin.id},
            synchronize_session=False,
        )
        db.commit()


@contextmanager
def session_scope():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
