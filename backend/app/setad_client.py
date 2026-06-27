from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from datetime import datetime
from typing import Any

import httpx
import redis.asyncio as redis

from .config import get_settings
from .filter_catalog import APP_TYPE_BY_BOARD, TRADE_TYPE_BY_TAG


settings = get_settings()
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
logger = logging.getLogger(__name__)


class SetadUpstreamError(RuntimeError):
    def __init__(self, message: str, *, attempts: int, status_code: int | None = None, timeout: bool = False) -> None:
        super().__init__(message)
        self.attempts = attempts
        self.status_code = status_code
        self.timeout = timeout


class SetadRateLimitError(RuntimeError):
    pass


class SetadRequestError(RuntimeError):
    def __init__(self, message: str, *, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


class SetadClient:
    def __init__(
        self,
        transport: httpx.AsyncBaseTransport | None = None,
        max_attempts: int | None = None,
        retry_delay: float | None = None,
        cache_enabled: bool | None = None,
    ) -> None:
        self.base = settings.setad_base_url.rstrip("/")
        self.timeout = settings.setad_http_timeout
        self.transport = transport
        self.max_attempts = max(1, max_attempts or settings.setad_retry_attempts)
        self.retry_delay = settings.setad_retry_delay_seconds if retry_delay is None else retry_delay
        self.cache_enabled = transport is None if cache_enabled is None else cache_enabled

    @staticmethod
    def _cache_key(path: str, params: dict[str, Any] | None) -> str:
        serialized = json.dumps([path, params or {}], ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def _read_cache(self, key: str, stale: bool = False) -> Any | None:
        if not self.cache_enabled:
            return None
        client = redis.from_url(settings.redis_url, decode_responses=True)
        try:
            value = await client.get(f"setad:{'stale' if stale else 'fresh'}:{key}")
            if not value:
                return None
            payload = json.loads(value)
            if isinstance(payload, dict):
                payload["_setad_cache"] = "stale" if stale else "fresh"
            return payload
        except Exception as exc:
            logger.warning("Setad cache read failed error=%s", type(exc).__name__)
            return None
        finally:
            await client.aclose()

    async def _write_cache(self, key: str, payload: Any) -> None:
        if not self.cache_enabled:
            return
        client = redis.from_url(settings.redis_url, decode_responses=True)
        try:
            serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            await client.setex(f"setad:fresh:{key}", settings.setad_cache_ttl_seconds, serialized)
            await client.setex(f"setad:stale:{key}", settings.setad_stale_cache_ttl_seconds, serialized)
        except Exception as exc:
            logger.warning("Setad cache write failed error=%s", type(exc).__name__)
        finally:
            await client.aclose()

    async def read_snapshot(self, namespace: str, value: Any, *, stale: bool = False) -> Any | None:
        key = self._cache_key(f"snapshot:{namespace}", value)
        return await self._read_cache(key, stale=stale)

    async def write_snapshot(self, namespace: str, value: Any, payload: Any) -> None:
        key = self._cache_key(f"snapshot:{namespace}", value)
        await self._write_cache(key, payload)

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        cache_key = self._cache_key(path, params)
        cached = await self._read_cache(cache_key)
        if cached is not None:
            return cached

        last_error: Exception | None = None
        last_status: int | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=self.timeout,
                    follow_redirects=True,
                    transport=self.transport,
                ) as client:
                    response = await client.get(f"{self.base}{path}", params=params)
                last_status = response.status_code
                if response.status_code == 428:
                    stale = await self._read_cache(cache_key, stale=True)
                    if stale is not None:
                        return stale
                    raise SetadRateLimitError("Setad public-board request limit is active")
                if response.status_code not in RETRYABLE_STATUS_CODES:
                    try:
                        payload = self.decode_response(response)
                    except httpx.HTTPStatusError as exc:
                        raise SetadRequestError(
                            "Setad rejected the public-board request",
                            status_code=response.status_code,
                        ) from exc
                    await self._write_cache(cache_key, payload)
                    return payload
                last_error = httpx.HTTPStatusError(
                    f"Setad returned {response.status_code}",
                    request=response.request,
                    response=response,
                )
            except httpx.RequestError as exc:
                last_error = exc

            if attempt < self.max_attempts:
                logger.warning(
                    "Setad request failed; retrying path=%s attempt=%s/%s status=%s error=%s",
                    path,
                    attempt,
                    self.max_attempts,
                    last_status,
                    type(last_error).__name__ if last_error else "unknown",
                )
                await asyncio.sleep(self.retry_delay * attempt)

        stale = await self._read_cache(cache_key, stale=True)
        if stale is not None:
            return stale
        raise SetadUpstreamError(
            "Setad public service did not respond successfully after retries",
            attempts=self.max_attempts,
            status_code=last_status,
            timeout=isinstance(last_error, httpx.TimeoutException),
        ) from last_error

    @staticmethod
    def decode_response(response: httpx.Response) -> Any:
        if response.status_code == 400:
            payload = response.json()
            if isinstance(payload, list) and any(str(item.get("code")) == "4001" for item in payload if isinstance(item, dict)):
                return {"content": [], "totalPages": 0, "totalElements": 0}
        response.raise_for_status()
        return response.json()

    async def list_cards(self, params: dict[str, Any]) -> dict[str, Any]:
        return await self._get("/cards/", params=params)

    async def list_categories(self, search: str = "", page_number: int = 0, page_size: int = 50) -> dict[str, Any]:
        return await self._get("/cards/setadCategory", params={"categorySearch": search, "pageNumber": page_number, "pageSize": page_size, "sort": "id,desc"})

    async def list_organizations(self, search: str = "", page_number: int = 0, page_size: int = 50, organization_state: int = 225) -> dict[str, Any]:
        return await self._get(
            "/cards/setadOrganization/",
            params={
                "organizationState": organization_state,
                "queryText": search,
                "pageNumber": page_number,
                "pageSize": page_size,
                "sort": "name,asc",
            },
        )

    async def list_cities(self, parent_loc_id: int | None = None, page_number: int = 0, page_size: int = 50) -> dict[str, Any]:
        params: dict[str, Any] = {"pageNumber": page_number, "pageSize": page_size, "sort": "id,desc"}
        if parent_loc_id is not None:
            params["parentLocId"] = parent_loc_id
        return await self._get("/cards/setadCity", params=params)

    async def offer_history(self, party_number: str, board_code: int | None, tag_code: int | None, page_number: int = 0, page_size: int = 10) -> dict[str, Any]:
        params = {
            "baseTradeType": party_number,
            "appType": APP_TYPE_BY_BOARD.get(board_code or 0, 955),
            "tradeType": TRADE_TYPE_BY_TAG.get(tag_code or 0, 1063),
            "queryText": "",
            "pageNumber": page_number,
            "pageSize": page_size,
        }
        return await self._get("/cards/offerHistoryGridInfo", params=params)


def normalize_raw_source(item: dict[str, Any]) -> tuple[str, str]:
    parts = [str(item.get("boardCode", "")), str(item.get("tagCode", "")), str(item.get("partyNumber", "")), str(item.get("number", "")), str(item.get("tableId", ""))]
    source_key = ":".join(parts)
    digest = hashlib.sha256(repr(sorted(item.items())).encode("utf-8", "ignore")).hexdigest()
    return source_key, digest


def pick_text(item: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = item.get(key)
        if value not in (None, "", []):
            return str(value)
    return ""


def parse_price(value: Any) -> float | None:
    if value in (None, "", "-"):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).replace(",", "").strip()
    try:
        return float(text)
    except ValueError:
        return None


def parse_dt(value: Any) -> str:
    if value in (None, ""):
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
