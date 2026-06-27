from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.crud import ingest_task_run, render_notification_digest
from app.database import Base
from app.models import MonitorTask, NotificationEvent


class FakeSetadClient:
    def __init__(self, pages, offers=None):
        self.pages = pages
        self.offers = offers or []

    async def list_cards(self, params):
        page = params["pageNumber"]
        content = self.pages[min(page, len(self.pages) - 1)] if self.pages else []
        return {"content": content, "totalPages": len(self.pages), "totalElements": sum(len(items) for items in self.pages)}

    async def offer_history(self, party_number, board_code, tag_code, page_number=0, page_size=10):
        content = self.offers[page_number] if page_number < len(self.offers) else []
        return {"content": content}


class NotificationEventTests(IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine, expire_on_commit=False)

    async def run_task_with_client(self, db, task, client):
        with patch("app.crud.SetadClient", lambda: client):
            run = await ingest_task_run(db, task)
            db.flush()
            return run

    async def test_first_successful_run_creates_initial_item_cards(self):
        with self.Session() as db:
            task = MonitorTask(name="کولر", filters={"keywords": ["کولر"], "searchTypeCode": 0})
            db.add(task)
            db.flush()
            run = await self.run_task_with_client(
                db,
                task,
                FakeSetadClient(
                    [[{"boardCode": 1, "tagCode": 1431, "partyNumber": "p1", "number": "31001", "tableId": "t1", "title": "خرید کولر"}]]
                ),
            )

            events = db.scalars(select(NotificationEvent).where(NotificationEvent.run_id == run.id)).all()

        self.assertEqual([event.event_type for event in events], ["baseline"])
        self.assertEqual(events[0].payload["trade_number"], "31001")
        self.assertIn("شماره: 31001", render_notification_digest(task, run, events))

    async def test_unchanged_followup_run_sends_no_events(self):
        with self.Session() as db:
            task = MonitorTask(name="کولر", filters={"keywords": ["کولر"], "searchTypeCode": 0})
            db.add(task)
            db.flush()
            client = FakeSetadClient(
                [[{"boardCode": 1, "tagCode": 1431, "partyNumber": "p1", "number": "31001", "tableId": "t1", "title": "خرید کولر"}]]
            )
            await self.run_task_with_client(db, task, client)
            second_run = await self.run_task_with_client(db, task, client)

            events = db.scalars(select(NotificationEvent).where(NotificationEvent.run_id == second_run.id)).all()

        self.assertEqual(events, [])

    async def test_followup_run_creates_new_listing_event_only_for_additions(self):
        with self.Session() as db:
            task = MonitorTask(name="کولر", filters={"keywords": ["کولر"], "searchTypeCode": 0})
            db.add(task)
            db.flush()
            await self.run_task_with_client(
                db,
                task,
                FakeSetadClient(
                    [[{"boardCode": 1, "tagCode": 1431, "partyNumber": "p1", "number": "31001", "tableId": "t1", "title": "خرید کولر"}]]
                ),
            )
            second_run = await self.run_task_with_client(
                db,
                task,
                FakeSetadClient(
                    [
                        [
                            {"boardCode": 1, "tagCode": 1431, "partyNumber": "p1", "number": "31001", "tableId": "t1", "title": "خرید کولر"},
                            {"boardCode": 1, "tagCode": 1431, "partyNumber": "p2", "number": "31002", "tableId": "t2", "title": "فروش کولر"},
                        ]
                    ]
                ),
            )

            events = db.scalars(select(NotificationEvent).where(NotificationEvent.run_id == second_run.id)).all()

        self.assertEqual([event.event_type for event in events], ["listing_new"])
        self.assertEqual(events[0].payload["trade_number"], "31002")

    async def test_followup_run_creates_listing_changed_event(self):
        with self.Session() as db:
            task = MonitorTask(name="کولر", filters={"keywords": ["کولر"], "searchTypeCode": 0})
            db.add(task)
            db.flush()
            await self.run_task_with_client(
                db,
                task,
                FakeSetadClient(
                    [[{"boardCode": 1, "tagCode": 1431, "partyNumber": "p1", "number": "31001", "tableId": "t1", "title": "خرید کولر"}]]
                ),
            )
            second_run = await self.run_task_with_client(
                db,
                task,
                FakeSetadClient(
                    [[{"boardCode": 1, "tagCode": 1431, "partyNumber": "p1", "number": "31001", "tableId": "t1", "title": "خرید کولر گازی"}]]
                ),
            )

            events = db.scalars(select(NotificationEvent).where(NotificationEvent.run_id == second_run.id)).all()

        self.assertEqual([event.event_type for event in events], ["listing_changed"])
        self.assertIn("گازی", events[0].payload["title"])

    async def test_auction_offer_history_creates_useful_offer_event_cards(self):
        listing = {
            "boardCode": 3,
            "tagCode": 343,
            "partyNumber": "auction-1",
            "number": "31003",
            "tableId": "t3",
            "title": "مزایده کولر",
        }
        with self.Session() as db:
            task = MonitorTask(name="مزایده کولر", filters={"keywords": ["کولر"], "searchTypeCode": 0}, include_offers=True)
            db.add(task)
            db.flush()
            await self.run_task_with_client(
                db,
                task,
                FakeSetadClient([[listing]], offers=[[{"id": 1, "supplierName": "شرکت اول", "proposalPrice": "100"}]]),
            )
            second_run = await self.run_task_with_client(
                db,
                task,
                FakeSetadClient([[listing]], offers=[[{"id": 2, "supplierName": "شرکت دوم", "proposalPrice": "200"}]]),
            )

            events = db.scalars(select(NotificationEvent).where(NotificationEvent.run_id == second_run.id)).all()
            digest = render_notification_digest(task, second_run, events)

        self.assertEqual([event.event_type for event in events], ["offer_new"])
        self.assertIn("پیشنهاددهنده: شرکت دوم", digest)
        self.assertIn("مبلغ پیشنهاد: 200", digest)
