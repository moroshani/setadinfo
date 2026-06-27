import unittest

from app.schemas import TaskFilters


class TaskFilterSchemaTests(unittest.TestCase):
    def test_blank_price_bounds_become_none(self):
        filters = TaskFilters(fromPrice="", toPrice="")

        self.assertIsNone(filters.fromPrice)
        self.assertIsNone(filters.toPrice)

    def test_relevance_sort_is_the_default(self):
        filters = TaskFilters()

        self.assertEqual(filters.sort, "score")


if __name__ == "__main__":
    unittest.main()
