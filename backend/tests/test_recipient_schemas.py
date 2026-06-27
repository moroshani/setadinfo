from unittest import TestCase

from pydantic import ValidationError

from app.schemas import RubikaRecipientCreate, TaskCreate, TaskFilters


class RecipientSchemaTests(TestCase):
    def test_accepts_supported_recipient_types(self):
        for recipient_type in ("user", "chat", "channel"):
            payload = RubikaRecipientCreate(name="Target", recipient_type=recipient_type, chat_id="chat-id")
            self.assertEqual(payload.recipient_type, recipient_type)

    def test_rejects_unknown_recipient_type(self):
        with self.assertRaises(ValidationError):
            RubikaRecipientCreate(name="Target", recipient_type="unknown", chat_id="chat-id")

    def test_task_accepts_multiple_recipient_ids(self):
        payload = TaskCreate(name="Monitor", filters=TaskFilters(), recipient_ids=["a", "b"])
        self.assertEqual(payload.recipient_ids, ["a", "b"])
