from unittest import IsolatedAsyncioTestCase, TestCase

import httpx

from app.crud import normalize_listing, normalize_offer
from app.setad_client import SetadClient, SetadRateLimitError, SetadRequestError, SetadUpstreamError


class SetadClientMetadataTests(IsolatedAsyncioTestCase):
    async def test_retries_transient_upstream_failures(self):
        attempts = 0

        async def handler(request: httpx.Request) -> httpx.Response:
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                return httpx.Response(503, json={"message": "temporary"})
            return httpx.Response(200, json={"content": [{"number": "1"}]})

        client = SetadClient(
            transport=httpx.MockTransport(handler),
            max_attempts=3,
            retry_delay=0,
        )

        payload = await client.list_cards({"pageNumber": 0})

        self.assertEqual(attempts, 3)
        self.assertEqual(payload["content"][0]["number"], "1")

    async def test_does_not_retry_non_transient_client_error(self):
        attempts = 0

        async def handler(request: httpx.Request) -> httpx.Response:
            nonlocal attempts
            attempts += 1
            return httpx.Response(422, json={"message": "invalid filter"})

        client = SetadClient(
            transport=httpx.MockTransport(handler),
            max_attempts=3,
            retry_delay=0,
        )

        with self.assertRaises(SetadRequestError) as raised:
            await client.list_cards({"pageNumber": 0})

        self.assertEqual(attempts, 1)
        self.assertEqual(raised.exception.status_code, 422)

    async def test_exhausted_transport_errors_report_attempt_count(self):
        attempts = 0

        async def handler(request):
            nonlocal attempts
            attempts += 1
            raise httpx.RemoteProtocolError("upstream disconnected", request=request)

        client = SetadClient(
            transport=httpx.MockTransport(handler),
            max_attempts=3,
            retry_delay=0,
        )

        with self.assertRaises(SetadUpstreamError) as raised:
            await client.list_cards({})

        self.assertEqual(attempts, 3)
        self.assertEqual(raised.exception.attempts, 3)

    async def test_public_board_limit_is_not_retried(self):
        attempts = 0

        async def handler(request: httpx.Request) -> httpx.Response:
            nonlocal attempts
            attempts += 1
            return httpx.Response(428, json={"flag": True})

        client = SetadClient(
            transport=httpx.MockTransport(handler),
            max_attempts=3,
            retry_delay=0,
        )

        with self.assertRaises(SetadRateLimitError):
            await client.list_cards({})

        self.assertEqual(attempts, 1)

    async def test_city_request_supports_parent_province(self):
        client = SetadClient()
        captured = {}

        async def fake_get(path, params=None):
            captured["path"] = path
            captured["params"] = params
            return {"content": []}

        client._get = fake_get
        await client.list_cities(parent_loc_id=411, page_number=0, page_size=50)

        self.assertEqual(captured["path"], "/cards/setadCity")
        self.assertEqual(captured["params"]["parentLocId"], 411)

    async def test_offer_history_uses_supported_page_size_and_trade_type(self):
        client = SetadClient()
        captured = {}

        async def fake_get(path, params=None):
            captured["path"] = path
            captured["params"] = params
            return {"content": []}

        client._get = fake_get
        await client.offer_history("1251794", board_code=3, tag_code=31)

        self.assertEqual(captured["params"]["pageSize"], 10)
        self.assertEqual(captured["params"]["tradeType"], 1061)


class SetadResponseTests(TestCase):
    def test_zero_result_response_becomes_empty_page(self):
        response = httpx.Response(
            400,
            json=[{"code": "4001", "message": "رکوردی یافت نشد"}],
            request=httpx.Request("GET", "https://example.test/cards/"),
        )

        self.assertEqual(SetadClient.decode_response(response), {"content": [], "totalPages": 0, "totalElements": 0})

    def test_listing_uses_live_send_deadline_field(self):
        listing = normalize_listing({"boardCode": 3, "tagCode": 31, "number": "1", "jalaliSendDeadlineDate": "1405/04/01"})

        self.assertEqual(listing["send_deadline"], "1405/04/01")

    def test_offer_uses_live_public_field_names(self):
        offer = normalize_offer(
            {
                "supplierName": "شرکت نمونه",
                "proposalPrice": "12,500,000",
                "responseDate": "2026-06-12T10:30:00",
            }
        )

        self.assertEqual(offer["bidder_name"], "شرکت نمونه")
        self.assertEqual(offer["amount"], 12_500_000)
        self.assertEqual(offer["submitted_at"], "2026-06-12T10:30:00")
