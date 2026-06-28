from unittest import TestCase

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.models import Base, Listing, MonitorTask, NotificationEvent, Offer, User
from scripts.seed_demo import DEMO_TASK_IDS, seed_demo_data


class DemoSeedTests(TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)

    def test_seed_creates_repeatable_demo_dataset(self):
        with Session(self.engine) as db:
            db.add(User(username="admin", password_hash="x", role="admin", enabled=True))
            db.commit()

            first = seed_demo_data(db)
            second = seed_demo_data(db)

            task_count = db.scalar(select(func.count()).select_from(MonitorTask).where(MonitorTask.id.in_(DEMO_TASK_IDS)))

        self.assertEqual(first["tasks"], 3)
        self.assertEqual(second["events"], 5)
        self.assertEqual(task_count, 3)

    def test_seed_keeps_non_demo_rows(self):
        with Session(self.engine) as db:
            db.add(User(username="admin", password_hash="x", role="admin", enabled=True))
            db.add(User(id="real-user", username="real-user", password_hash="x", role="operator", enabled=True))
            real_task = MonitorTask(id="real-task", name="real", filters={}, owner_id="real-user")
            real_listing = Listing(source_key="real:listing", title="real listing")
            db.add_all([real_task, real_listing])
            db.commit()

            seed_demo_data(db)
            seed_demo_data(db)

            users = set(db.scalars(select(User.username)).all())
            real_listing_count = db.scalar(select(func.count()).select_from(Listing).where(Listing.source_key == "real:listing"))
            demo_listing_count = db.scalar(select(func.count()).select_from(Listing).where(Listing.source_key.like("demo:%")))
            demo_offer_count = db.scalar(select(func.count()).select_from(Offer).where(Offer.source_key.like("demo:%")))
            demo_event_count = db.scalar(select(func.count()).select_from(NotificationEvent).where(NotificationEvent.dedupe_key.like("demo:%")))

        self.assertIn("real-user", users)
        self.assertIn("demo-operator", users)
        self.assertEqual(real_listing_count, 1)
        self.assertEqual(demo_listing_count, 4)
        self.assertEqual(demo_offer_count, 3)
        self.assertEqual(demo_event_count, 5)
