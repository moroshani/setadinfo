from unittest import TestCase

from app.auth import can_manage_task, can_write_tasks, hash_password, verify_password
from app.models import MonitorTask, User


class PasswordTests(TestCase):
    def test_password_hash_verifies_only_the_original_password(self):
        encoded = hash_password("correct horse battery staple")

        self.assertTrue(verify_password("correct horse battery staple", encoded))
        self.assertFalse(verify_password("wrong password", encoded))
        self.assertNotIn("correct horse battery staple", encoded)


class TaskAuthorizationTests(TestCase):
    def test_role_and_ownership_rules(self):
        admin = User(id="admin-id", username="admin", role="admin")
        operator = User(id="operator-id", username="operator", role="operator")
        other_operator = User(id="other-id", username="other", role="operator")
        viewer = User(id="viewer-id", username="viewer", role="viewer")
        task = MonitorTask(id="task-id", name="owned", owner_id=operator.id)

        self.assertTrue(can_write_tasks(admin))
        self.assertTrue(can_write_tasks(operator))
        self.assertFalse(can_write_tasks(viewer))
        self.assertTrue(can_manage_task(admin, task))
        self.assertTrue(can_manage_task(operator, task))
        self.assertFalse(can_manage_task(other_operator, task))
        self.assertFalse(can_manage_task(viewer, task))

