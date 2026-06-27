from unittest import IsolatedAsyncioTestCase, TestCase

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.crud import fetch_all_offer_history, upsert_offer
from app.database import Base
from app.models import Listing, Offer


class OfferHistoryPaginationTests(IsolatedAsyncioTestCase):
    async def test_fetches_offer_pages_until_a_partial_page(self):
        class FakeClient:
            def __init__(self):
                self.pages = []

            async def offer_history(self, party_number, board_code, tag_code, page_number=0, page_size=10):
                self.pages.append(page_number)
                count = 10 if page_number == 0 else 1
                return {"content": [{"id": f"{page_number}-{index}"} for index in range(count)]}

        client = FakeClient()

        offers = await fetch_all_offer_history(client, "1251794", 3, 343, max_pages=5)

        self.assertEqual(len(offers), 11)
        self.assertEqual(client.pages, [0, 1])


class OfferPersistenceTests(TestCase):
    def setUp(self):
        engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine, expire_on_commit=False)

    def test_upsert_updates_changed_offer_without_duplicate(self):
        db = self.Session()
        listing = Listing(source_key="3:343:1251794:1:", title="auction")
        db.add(listing)
        db.flush()

        first_changed = upsert_offer(
            db,
            listing,
            "3:343:1251794:1:",
            {"id": 99, "supplierName": "Supplier", "proposalPrice": "100", "responseDate": "2026-06-12"},
        )
        db.flush()
        second_changed = upsert_offer(
            db,
            listing,
            "3:343:1251794:1:",
            {"id": 99, "supplierName": "Supplier", "proposalPrice": "125", "responseDate": "2026-06-12"},
        )
        db.flush()

        offers = db.scalars(select(Offer)).all()
        self.assertTrue(first_changed)
        self.assertTrue(second_changed)
        self.assertEqual(len(offers), 1)
        self.assertEqual(offers[0].amount, 125)

