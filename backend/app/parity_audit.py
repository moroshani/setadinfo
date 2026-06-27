from __future__ import annotations

import asyncio
import json
import os
from datetime import date, timedelta
from typing import Any

from .crud import fetch_live_results, normalize_listing, transient_listing_to_dict
from .filter_catalog import BOARD_OPTIONS
from .filters import build_setad_params, title_matches_keywords
from .setad_client import SetadClient


def source_keys(items: list[dict[str, Any]]) -> list[str]:
    return [normalize_listing(item)["source_key"] for item in items]


async def compare_passthrough(
    client: SetadClient,
    name: str,
    filters: dict[str, Any],
    *,
    page: int = 0,
    page_size: int = 5,
) -> dict[str, Any]:
    direct = await client.list_cards(build_setad_params(filters, page, page_size))
    result = await fetch_live_results(filters, page, page_size, client=client)
    direct_items = list(direct.get("content") or direct.get("data") or [])
    passed = (
        int(direct.get("totalElements") or 0) == result["total_elements"]
        and int(direct.get("totalPages") or 0) == result["total_pages"]
        and source_keys(direct_items) == [item["source_key"] for item in result["items"]]
    )
    return {
        "name": name,
        "passed": passed,
        "direct_total": direct.get("totalElements", 0),
        "app_total": result["total_elements"],
        "direct_pages": direct.get("totalPages", 0),
        "app_pages": result["total_pages"],
        "direct_rows": len(direct_items),
        "app_rows": len(result["items"]),
        "direct_ids": source_keys(direct_items),
        "app_ids": [item["source_key"] for item in result["items"]],
    }


async def compare_multi_keyword(client: SetadClient, delay_seconds: float) -> dict[str, Any]:
    filters = {"searchTypeCode": 0, "keywords": ["کولر", "گازی"], "keyword": "کولر", "sort": "score"}
    page_size = 5
    first = await client.list_cards(build_setad_params(filters, 0, 100))
    raw_items = list(first.get("content") or first.get("data") or [])
    for page in range(1, int(first.get("totalPages") or 0)):
        await asyncio.sleep(delay_seconds)
        payload = await client.list_cards(build_setad_params(filters, page, 100))
        raw_items.extend(payload.get("content") or payload.get("data") or [])
    expected = [
        transient_listing_to_dict(item)
        for item in raw_items
        if title_matches_keywords(str(item.get("title") or ""), filters)
    ]
    result = await fetch_live_results(filters, 0, page_size, client=client)
    passed = (
        result["total_elements"] == len(expected)
        and result["total_pages"] == (len(expected) + page_size - 1) // page_size
        and [item["source_key"] for item in result["items"]] == [item["source_key"] for item in expected[:page_size]]
    )
    return {
        "name": "multi_keyword_title_and",
        "passed": passed,
        "expected_total": len(expected),
        "app_total": result["total_elements"],
        "expected_pages": (len(expected) + page_size - 1) // page_size,
        "app_pages": result["total_pages"],
        "expected_ids": [item["source_key"] for item in expected[:page_size]],
        "app_ids": [item["source_key"] for item in result["items"]],
    }


async def main() -> None:
    client = SetadClient()
    delay_seconds = float(os.getenv("SETAD_AUDIT_DELAY_SECONDS", "10"))
    scenarios: list[tuple[str, dict[str, Any], int]] = [
        ("default_relevance", {"searchTypeCode": 0, "sort": "score"}, 0),
        ("keyword_cooler_page_1", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "score"}, 0),
        ("keyword_cooler_page_2", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "score"}, 1),
        ("keyword_vehicle", {"searchTypeCode": 0, "keywords": ["خودرو"], "sort": "score"}, 0),
        ("keyword_asphalt", {"searchTypeCode": 0, "keywords": ["آسفالت"], "sort": "score"}, 0),
        ("keyword_english_hvac", {"searchTypeCode": 0, "keywords": ["HVAC"], "sort": "score"}, 0),
        ("sort_newest", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "newerInsertDate"}, 0),
        ("sort_oldest", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "olderInsertDate"}, 0),
        ("sort_active", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "onPerforming"}, 0),
        ("sort_shortest_deadline", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "newerJalaliSendDeadLineDate"}, 0),
        ("sort_longest_deadline", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "olderJalaliSendDeadLineDate"}, 0),
        ("board_buy", {"searchTypeCode": 0, "sort": "score", "boardCodes": [1]}, 0),
        ("board_tender", {"searchTypeCode": 0, "sort": "score", "boardCodes": [2]}, 0),
        ("board_auction", {"searchTypeCode": 0, "sort": "score", "boardCodes": [3]}, 0),
        ("buy_cooler", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "score", "boardCodes": [1]}, 0),
        ("tender_vehicle", {"searchTypeCode": 0, "keywords": ["خودرو"], "sort": "score", "boardCodes": [2]}, 0),
        ("auction_cooler", {"searchTypeCode": 0, "keywords": ["کولر"], "sort": "score", "boardCodes": [3]}, 0),
        ("category_vehicles", {"searchTypeCode": 0, "sort": "score", "selectedCategory": [180]}, 0),
        ("organization_live_id", {"searchTypeCode": 0, "sort": "score", "selectedOrganization": ["42217"]}, 0),
        ("province_isfahan", {"searchTypeCode": 0, "sort": "score", "selectedProvinces": ["403"]}, 0),
        (
            "price_range",
            {"searchTypeCode": 0, "sort": "score", "fromPrice": "1000000", "toPrice": "100000000"},
            0,
        ),
    ]
    for board_code, board in BOARD_OPTIONS.items():
        for tag_code in board["children"]:
            scenarios.append(
                (
                    f"board_{board_code}_tag_{tag_code}",
                    {"searchTypeCode": 0, "sort": "score", "boardCodes": [board_code], "tagCodes": [tag_code]},
                    0,
                )
            )

    cities = await client.list_cities(parent_loc_id=403, page_number=0, page_size=5)
    city = next(iter(cities.get("content") or []), None)
    if city:
        scenarios.append(
            (
                "city_isfahan_child",
                {
                    "searchTypeCode": 0,
                    "sort": "score",
                    "selectedCities": [f"403-{city['locId']}"],
                },
                0,
            )
        )

    today = date.today()
    scenarios.extend(
        [
            (
                "send_deadline_range",
                {
                    "searchTypeCode": 0,
                    "sort": "score",
                    "fromSendDeadlineDate": (today - timedelta(days=3)).isoformat(),
                    "toSendDeadlineDate": (today + timedelta(days=10)).isoformat(),
                },
                0,
            ),
            (
                "document_deadline_range",
                {
                    "searchTypeCode": 0,
                    "sort": "score",
                    "fromDocumentDeadlineDate": (today - timedelta(days=3)).isoformat(),
                    "toDocumentDeadlineDate": (today + timedelta(days=10)).isoformat(),
                },
                0,
            ),
        ]
    )

    results = []
    for name, filters, page in scenarios:
        try:
            results.append(await compare_passthrough(client, name, filters, page=page))
        except Exception as exc:
            results.append({"name": name, "passed": False, "error": f"{type(exc).__name__}: {exc}"})
            break
        await asyncio.sleep(delay_seconds)

    cooler = await client.list_cards(
        build_setad_params({"searchTypeCode": 0, "keywords": ["کولر"], "sort": "score"}, 0, 5)
    )
    first_listing = next(iter(cooler.get("content") or []), None)
    if first_listing:
        try:
            results.append(
                await compare_passthrough(
                    client,
                    "exact_trade_number",
                    {
                        "searchTypeCode": 1,
                        "keyword": str(first_listing.get("number") or ""),
                        "sort": "score",
                    },
                )
            )
        except Exception as exc:
            results.append({"name": "exact_trade_number", "passed": False, "error": f"{type(exc).__name__}: {exc}"})

    try:
        results.append(await compare_multi_keyword(client, delay_seconds))
    except Exception as exc:
        results.append({"name": "multi_keyword_title_and", "passed": False, "error": f"{type(exc).__name__}: {exc}"})
    failed = [result["name"] for result in results if not result["passed"]]
    output = {
        "passed": not failed,
        "scenario_count": len(results),
        "passed_count": len(results) - len(failed),
        "failed": failed,
        "results": results,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
