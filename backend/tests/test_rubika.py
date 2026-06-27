from unittest import IsolatedAsyncioTestCase, TestCase

import httpx

from app.rubika_client import RubikaClient, extract_chat_ids, get_all_updates
from app.tasks import notification_chat_ids, should_notify_run


class RubikaClientTests(IsolatedAsyncioTestCase):
    async def test_send_message_uses_official_v3_endpoint(self):
        captured = {}

        async def handler(request: httpx.Request) -> httpx.Response:
            captured["url"] = str(request.url)
            captured["payload"] = request.content
            return httpx.Response(200, json={"message_id": "123"})

        client = RubikaClient(token="bot-token", transport=httpx.MockTransport(handler))

        result = await client.send_message("chat-id", "test")

        self.assertTrue(result.ok)
        self.assertEqual(captured["url"], "https://botapi.rubika.ir/v3/bot-token/sendMessage")
        self.assertIn(b'"chat_id":"chat-id"', captured["payload"])

    async def test_get_updates_returns_official_payload(self):
        captured = {}

        async def handler(request: httpx.Request) -> httpx.Response:
            captured["payload"] = request.content
            return httpx.Response(200, json={"updates": [{"chat_id": "chat-id"}], "next_offset_id": "next"})

        client = RubikaClient(token="bot-token", transport=httpx.MockTransport(handler))

        result = await client.get_updates(limit=10, offset_id="offset")

        self.assertTrue(result.ok)
        self.assertEqual(result.raw["updates"][0]["chat_id"], "chat-id")
        self.assertIn(b'"offset_id":"offset"', captured["payload"])

    async def test_non_ok_rubika_status_is_an_error(self):
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"status": "INVALID_INPUT"})

        client = RubikaClient(token="bot-token", transport=httpx.MockTransport(handler))

        result = await client.send_message("invalid-chat", "test")

        self.assertFalse(result.ok)
        self.assertEqual(result.error, "INVALID_INPUT")

    async def test_get_all_updates_follows_next_offset_pages(self):
        class FakeClient:
            def __init__(self):
                self.offsets = []

            async def get_updates(self, limit=100, offset_id=None):
                self.offsets.append(offset_id)
                if offset_id is None:
                    return type("Result", (), {
                        "ok": True,
                        "raw": {
                            "status": "OK",
                            "data": {
                                "updates": [{"chat_id": "user-chat"}],
                                "next_offset_id": "next-page",
                            },
                        },
                        "error": "",
                    })()
                return type("Result", (), {
                    "ok": True,
                    "raw": {
                        "status": "OK",
                        "data": {
                            "updates": [{"chat_id": "group-chat"}],
                            "next_offset_id": "next-page",
                        },
                    },
                    "error": "",
                })()

        client = FakeClient()

        result = await get_all_updates(client=client, limit=100, max_pages=5)

        self.assertTrue(result.ok)
        self.assertEqual(client.offsets, [None, "next-page"])
        self.assertEqual(extract_chat_ids(result.raw), ["user-chat", "group-chat"])


class RubikaNotificationTests(TestCase):
    def test_only_notifies_for_successful_changed_runs(self):
        self.assertFalse(should_notify_run("success", 0))
        self.assertFalse(should_notify_run("error", 2))
        self.assertTrue(should_notify_run("success", 2))

    def test_extracts_unique_chat_ids_from_nested_updates(self):
        payload = {
            "data": {
                "updates": [
                    {"chat_id": "chat-a", "new_message": {"sender_id": "user-a"}},
                    {"new_message": {"chat_id": "chat-b"}},
                    {"chat_id": "chat-a"},
                ]
            }
        }

        self.assertEqual(extract_chat_ids(payload), ["chat-a", "chat-b"])

    def test_extracts_forwarded_source_chat_ids(self):
        payload = {
            "data": {
                "updates": [
                    {
                        "chat_id": "personal-chat",
                        "new_message": {
                            "forwarded_from": {
                                "type_from": "Channel",
                                "from_chat_id": "channel-chat",
                            }
                        },
                    },
                    {
                        "chat_id": "personal-chat",
                        "new_message": {
                            "forwarded_from": {
                                "type_from": "Group",
                                "from_chat_id": "group-chat",
                            }
                        },
                    },
                ]
            }
        }

        self.assertEqual(extract_chat_ids(payload), ["personal-chat", "channel-chat", "group-chat"])

    def test_monitor_uses_all_enabled_unique_recipients(self):
        class Recipient:
            def __init__(self, chat_id, enabled=True):
                self.chat_id = chat_id
                self.enabled = enabled

        class Task:
            rubika_chat_id = "legacy"
            recipients = [
                Recipient("chat-a"),
                Recipient("chat-b"),
                Recipient("chat-a"),
                Recipient("disabled", enabled=False),
            ]

        self.assertEqual(notification_chat_ids(Task(), "default"), ["chat-a", "chat-b"])

    def test_monitor_falls_back_to_legacy_or_default_recipient(self):
        class Task:
            recipients = []
            rubika_chat_id = ""

        self.assertEqual(notification_chat_ids(Task(), "default"), ["default"])
