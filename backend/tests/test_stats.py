from unittest import TestCase

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.crud import cleanup_orphan_listings, stored_listings_page, task_stats
from app.models import Base, Listing, MonitorTask, TaskMatch


class DashboardStatsTests(TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)

    def test_counts_only_listings_attached_to_a_monitor(self):
        with Session(self.engine) as db:
            task = MonitorTask(name="tracked", filters={})
            tracked = Listing(source_key="tracked")
            orphan = Listing(source_key="orphan")
            db.add_all([task, tracked, orphan])
            db.flush()
            db.add(TaskMatch(task_id=task.id, listing_id=tracked.id))
            db.commit()

            stats = task_stats(db)

        self.assertEqual(stats["total_listings"], 1)

    def test_stored_listing_pages_exclude_orphans_and_report_true_totals(self):
        with Session(self.engine) as db:
            task = MonitorTask(name="tracked", filters={})
            listings = [
                Listing(source_key=f"tracked-{index}", trade_number=str(index), title=f"result {index}")
                for index in range(3)
            ]
            orphan = Listing(source_key="orphan", title="must not appear")
            db.add_all([task, *listings, orphan])
            db.flush()
            db.add_all(TaskMatch(task_id=task.id, listing_id=listing.id) for listing in listings)
            db.commit()

            result = stored_listings_page(
                db,
                page=1,
                page_size=2,
                sort_by="trade_number",
                sort_dir="asc",
            )

        self.assertEqual(result["total_elements"], 3)
        self.assertEqual(result["total_pages"], 2)
        self.assertEqual([item["trade_number"] for item in result["items"]], ["2"])

    def test_stored_listing_page_returns_one_row_when_multiple_tasks_match(self):
        with Session(self.engine) as db:
            first_task = MonitorTask(name="first", filters={})
            second_task = MonitorTask(name="second", filters={})
            listing = Listing(source_key="shared", raw={"setad": "payload"})
            db.add_all([first_task, second_task, listing])
            db.flush()
            db.add_all(
                [
                    TaskMatch(task_id=first_task.id, listing_id=listing.id),
                    TaskMatch(task_id=second_task.id, listing_id=listing.id),
                ]
            )
            db.commit()

            result = stored_listings_page(db, page=0, page_size=5)

        self.assertEqual(result["total_elements"], 1)
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(result["items"][0]["source_key"], "shared")

    def test_cleanup_removes_only_unreferenced_listings(self):
        with Session(self.engine) as db:
            task = MonitorTask(name="tracked", filters={})
            tracked = Listing(source_key="tracked")
            orphan = Listing(source_key="orphan")
            db.add_all([task, tracked, orphan])
            db.flush()
            db.add(TaskMatch(task_id=task.id, listing_id=tracked.id))
            db.commit()

            removed = cleanup_orphan_listings(db)
            db.commit()

            remaining = db.query(Listing).order_by(Listing.source_key).all()

        self.assertEqual(removed, 1)
        self.assertEqual([listing.source_key for listing in remaining], ["tracked"])
