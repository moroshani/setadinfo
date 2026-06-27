from unittest import TestCase

from app.filters import (
    build_setad_params,
    normalized_excluded_keywords,
    normalized_keywords,
    title_matches_keywords,
)


class BuildSetadParamsTests(TestCase):
    def test_uses_live_setad_parameter_names(self):
        params = build_setad_params(
            {
                "keyword": "خودرو",
                "searchTypeCode": 0,
                "sort": "newerInsertDate",
                "boardCodes": [3],
                "tagCodes": [31, 343],
                "selectedOrganization": ["6706"],
                "selectedCategory": [180],
                "selectedProvinces": ["411"],
                "selectedCities": ["411-454"],
                "classificationId": [80901, 80902],
                "notOrgId": ["12"],
            },
            page_number=2,
            page_size=50,
        )

        self.assertEqual(params["keyword"], "خودرو")
        self.assertEqual(params["boardCode"], "3")
        self.assertEqual(params["tagCode"], "31,343")
        self.assertNotIn("queryText", params)
        self.assertNotIn("boardCodes", params)
        self.assertNotIn("tagCodes", params)

    def test_keywords_use_first_value_for_setad_and_require_all_in_title(self):
        filters = {
            "searchTypeCode": 0,
            "keyword": "",
            "keywords": [" کولر ", "گازی", "کولر"],
        }

        params = build_setad_params(filters, page_number=0, page_size=50)

        self.assertEqual(normalized_keywords(filters), ["کولر", "گازی"])
        self.assertEqual(params["keyword"], "کولر")
        self.assertTrue(title_matches_keywords("فروش کولر گازی ایستاده", filters))
        self.assertFalse(title_matches_keywords("فروش کولر آبی", filters))

    def test_legacy_keyword_remains_supported(self):
        filters = {"searchTypeCode": 0, "keyword": "خودرو"}

        self.assertEqual(normalized_keywords(filters), ["خودرو"])
        self.assertTrue(title_matches_keywords("مزایده خودرو سازمانی", filters))

    def test_trade_number_search_is_not_title_filtered(self):
        filters = {"searchTypeCode": 1, "keyword": "310500"}

        self.assertTrue(title_matches_keywords("عنوان بدون شماره", filters))

    def test_excluded_keywords_reject_any_matching_title_term(self):
        filters = {
            "searchTypeCode": 0,
            "keywords": ["کولر"],
            "excludedKeywords": [" آبی ", "كهنه", "آبی"],
        }

        self.assertEqual(normalized_excluded_keywords(filters), ["آبی", "كهنه"])
        self.assertTrue(title_matches_keywords("فروش کولر گازی جدید", filters))
        self.assertFalse(title_matches_keywords("فروش کولر آبی جدید", filters))
        self.assertFalse(title_matches_keywords("فروش كولر ابي جدید", filters))
        self.assertFalse(title_matches_keywords("فروش کولر کهنه", filters))

    def test_trade_number_search_ignores_excluded_keywords(self):
        filters = {
            "searchTypeCode": 1,
            "keyword": "310500",
            "excludedKeywords": ["آبی"],
        }

        self.assertTrue(title_matches_keywords("کولر آبی", filters))
