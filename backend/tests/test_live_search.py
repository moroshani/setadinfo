from unittest import IsolatedAsyncioTestCase, TestCase

from app.crud import fetch_live_results
from app.filters import listing_matches_filters
from app.setad_client import SetadClient, SetadRateLimitError


class LiveSearchTests(IsolatedAsyncioTestCase):
    async def test_normalizes_results_and_forwards_pagination_without_database(self):
        captured = {}

        class FakeClient:
            async def list_cards(self, params):
                captured.update(params)
                return {
                    "content": [
                        {
                            "boardCode": 3,
                            "tagCode": 343,
                            "partyNumber": "party-1",
                            "number": "31001",
                            "tableId": "table-1",
                            "title": "فروش کولر گازی",
                            "organizationName": "سازمان نمونه",
                        }
                    ],
                    "totalElements": 101,
                    "totalPages": 3,
                }

        result = await fetch_live_results(
            {"searchTypeCode": 1, "keyword": "31001"},
            page_number=2,
            page_size=50,
            client=FakeClient(),
        )

        self.assertEqual(captured["pageNumber"], 2)
        self.assertEqual(captured["pageSize"], 50)
        self.assertEqual(result["total_elements"], 101)
        self.assertEqual(result["total_pages"], 3)
        self.assertEqual(result["items"][0]["trade_number"], "31001")
        self.assertEqual(result["items"][0]["source_key"], "3:343:party-1:31001:table-1")
        self.assertEqual(result["items"][0]["raw"]["organizationName"], "سازمان نمونه")

    async def test_strict_search_uses_stale_snapshot_during_setad_limit(self):
        client = SetadClient(cache_enabled=False)
        reads = []

        async def read_snapshot(namespace, value, *, stale=False):
            reads.append(stale)
            if stale:
                return {
                    "items": [
                        {
                            "id": "cached",
                            "source_key": "1:1431::1:",
                            "trade_number": "1",
                            "title": "کولر گازی",
                        }
                    ]
                }
            return None

        async def list_cards(_):
            raise SetadRateLimitError("limited")

        client.read_snapshot = read_snapshot
        client.list_cards = list_cards

        result = await fetch_live_results(
            {"searchTypeCode": 0, "keywords": ["کولر"]},
            page_number=0,
            page_size=5,
            client=client,
        )

        self.assertEqual(reads, [False, True])
        self.assertEqual(result["source_status"], "stale")
        self.assertEqual(result["items"][0]["trade_number"], "1")

    async def test_applies_all_title_keywords_to_live_results(self):
        calls = []

        class FakeClient:
            async def list_cards(self, params):
                calls.append(params)
                pages = [
                    [
                        {"boardCode": 3, "tagCode": 343, "number": "1", "title": "فروش کولر گازی"},
                        {"boardCode": 3, "tagCode": 343, "number": "2", "title": "فروش کولر آبی"},
                    ],
                    [
                        {"boardCode": 1, "tagCode": 1431, "number": "3", "title": "خرید کولر گازی"},
                        {"boardCode": 1, "tagCode": 1431, "number": "4", "title": "خرید بخاری گازی"},
                    ],
                ]
                return {
                    "content": pages[params["pageNumber"]],
                    "totalElements": 4,
                    "totalPages": 2,
                }

        result = await fetch_live_results(
            {"searchTypeCode": 0, "keywords": ["کولر", "گازی"]},
            page_number=0,
            page_size=1,
            client=FakeClient(),
        )

        self.assertEqual([item["trade_number"] for item in result["items"]], ["1"])
        self.assertEqual(result["total_elements"], 2)
        self.assertEqual(result["total_pages"], 2)
        self.assertEqual([call["pageNumber"] for call in calls], [0, 1])

    async def test_single_keyword_filters_grouped_and_fuzzy_setad_candidates(self):
        calls = []

        class FakeClient:
            async def list_cards(self, params):
                calls.append(params)
                return {
                    "content": [
                        {"boardCode": 1, "tagCode": 1431, "number": "1", "title": "کولر گازی"},
                        {"boardCode": 1, "tagCode": 1431, "number": "2", "title": "رنگ آمیزی ساختمان"},
                        {"boardCode": 1, "tagCode": 1431, "number": "3", "title": "حراج کولگ"},
                        {"boardCode": 1, "tagCode": 1431, "number": "4", "title": "خدمات کوی کوثر"},
                    ],
                    "totalElements": 4,
                    "totalPages": 1,
                }

        result = await fetch_live_results(
            {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "score"},
            page_number=0,
            page_size=5,
            client=FakeClient(),
        )

        self.assertEqual([item["trade_number"] for item in result["items"]], ["1"])
        self.assertEqual(result["total_elements"], 1)
        self.assertEqual(result["total_pages"], 1)
        self.assertEqual([call["pageNumber"] for call in calls], [0])

    async def test_negative_keywords_scan_candidates_and_recalculate_pagination(self):
        calls = []

        class FakeClient:
            async def list_cards(self, params):
                calls.append(params)
                pages = [
                    [
                        {"boardCode": 1, "tagCode": 1431, "number": "1", "title": "کولر گازی"},
                        {"boardCode": 1, "tagCode": 1431, "number": "2", "title": "کولر آبی"},
                    ],
                    [
                        {"boardCode": 3, "tagCode": 343, "number": "3", "title": "مزایده کولر صنعتی"},
                        {"boardCode": 3, "tagCode": 343, "number": "4", "title": "کولر آبی دست دوم"},
                    ],
                ]
                return {
                    "content": pages[params["pageNumber"]],
                    "totalElements": 4,
                    "totalPages": 2,
                }

        result = await fetch_live_results(
            {
                "searchTypeCode": 0,
                "keywords": ["کولر"],
                "excludedKeywords": ["آبی"],
            },
            page_number=0,
            page_size=1,
            client=FakeClient(),
        )

        self.assertEqual([item["trade_number"] for item in result["items"]], ["1"])
        self.assertEqual(result["total_elements"], 2)
        self.assertEqual(result["total_pages"], 2)
        self.assertEqual([call["pageNumber"] for call in calls], [0, 1])


class SingleItemMatchingTests(TestCase):
    def test_single_item_mode_requires_all_available_stable_identifiers(self):
        filters = {
            "monitorMode": "item",
            "targetSourceKey": "3:343:party-1:31001:table-1",
            "targetTradeNumber": "31001",
            "targetPartyNumber": "party-1",
            "targetBoardCode": 3,
            "targetTagCode": 343,
        }
        expected = {
            "source_key": "3:343:party-1:31001:table-1",
            "trade_number": "31001",
            "party_number": "party-1",
            "board_code": 3,
            "tag_code": 343,
            "title": "فروش کولر گازی",
        }

        self.assertTrue(listing_matches_filters(expected, filters))
        self.assertFalse(listing_matches_filters({**expected, "trade_number": "31002"}, filters))
        self.assertFalse(listing_matches_filters({**expected, "party_number": "party-2"}, filters))

    def test_filter_mode_keeps_future_matching_items_eligible(self):
        filters = {"monitorMode": "filter", "searchTypeCode": 0, "keywords": ["کولر", "گازی"]}

        self.assertTrue(
            listing_matches_filters(
                {"title": "آگهی جدید فروش کولر گازی", "trade_number": "tomorrow"},
                filters,
            )
        )
