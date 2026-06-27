from __future__ import annotations

from collections.abc import Iterable


def normalize_search_text(value: object) -> str:
    return (
        " ".join(str(value or "").replace("\u200c", " ").replace("\u200f", " ").split())
        .translate(str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "آ": "ا", "أ": "ا", "إ": "ا"}))
        .casefold()
    )


def join_values(values: Iterable[object]) -> str:
    clean = [str(v) for v in values if v not in (None, "", [])]
    return ",".join(clean)


def normalized_keywords(filters: dict) -> list[str]:
    values = filters.get("keywords") or []
    if not values and filters.get("keyword"):
        values = [filters["keyword"]]
    result: list[str] = []
    for value in values:
        keyword = str(value).strip()
        if keyword and keyword not in result:
            result.append(keyword)
    return result


def normalized_excluded_keywords(filters: dict) -> list[str]:
    result: list[str] = []
    normalized_seen: set[str] = set()
    for value in filters.get("excludedKeywords") or []:
        keyword = str(value).strip()
        normalized = normalize_search_text(keyword)
        if normalized and normalized not in normalized_seen:
            result.append(keyword)
            normalized_seen.add(normalized)
    return result


def title_matches_keywords(title: str, filters: dict) -> bool:
    if int(filters.get("searchTypeCode", 0)) != 0:
        return True
    keywords = normalized_keywords(filters)
    excluded_keywords = normalized_excluded_keywords(filters)
    normalized_title = normalize_search_text(title)
    return all(normalize_search_text(keyword) in normalized_title for keyword in keywords) and not any(
        normalize_search_text(keyword) in normalized_title for keyword in excluded_keywords
    )


def listing_matches_filters(listing: dict, filters: dict) -> bool:
    if filters.get("monitorMode", "filter") != "item":
        return title_matches_keywords(str(listing.get("title") or ""), filters)

    target_map = {
        "targetSourceKey": "source_key",
        "targetTradeNumber": "trade_number",
        "targetPartyNumber": "party_number",
        "targetBoardCode": "board_code",
        "targetTagCode": "tag_code",
    }
    compared = False
    for target_key, listing_key in target_map.items():
        expected = filters.get(target_key)
        if expected in (None, ""):
            continue
        compared = True
        if str(listing.get(listing_key, "")) != str(expected):
            return False
    return compared


def build_setad_params(filters: dict, page_number: int, page_size: int, query_text: str | None = None) -> dict:
    keywords = normalized_keywords(filters)
    item_trade_number = filters.get("targetTradeNumber", "") if filters.get("monitorMode") == "item" else ""
    params = {
        "keyword": query_text if query_text is not None else (item_trade_number or (keywords[0] if keywords else filters.get("keyword", ""))),
        "searchTypeCode": 1 if item_trade_number else filters.get("searchTypeCode", 0),
        "pageNumber": page_number,
        "pageSize": page_size,
        "sort": filters.get("sort", "newerInsertDate"),
    }
    key_map = {
        "boardCodes": "boardCode",
        "tagCodes": "tagCode",
        "selectedOrganization": "selectedOrganization",
        "selectedCategory": "selectedCategory",
        "selectedProvinces": "selectedProvinces",
        "selectedCities": "selectedCities",
        "classificationId": "classificationId",
        "notOrgId": "notOrgId",
    }
    for source_key, target_key in key_map.items():
        value = filters.get(source_key, [])
        if value:
            params[target_key] = join_values(value)
    for key in ("fromSendDeadlineDate", "toSendDeadlineDate", "fromDocumentDeadlineDate", "toDocumentDeadlineDate", "fromPrice", "toPrice"):
        value = filters.get(key)
        if value not in (None, "", []):
            params[key] = value
    return params
