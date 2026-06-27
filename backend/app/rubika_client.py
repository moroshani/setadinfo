from __future__ import annotations

from dataclasses import dataclass

import httpx

from .config import get_settings


settings = get_settings()


@dataclass
class RubikaSendResult:
    ok: bool
    raw: dict | None = None
    error: str = ""


def extract_chat_ids(payload: object) -> list[str]:
    found: list[str] = []

    def visit(value: object) -> None:
        if isinstance(value, dict):
            chat_id = value.get("chat_id")
            if chat_id not in (None, "") and str(chat_id) not in found:
                found.append(str(chat_id))
            forwarded_chat_id = value.get("from_chat_id")
            if forwarded_chat_id not in (None, "") and str(forwarded_chat_id) not in found:
                found.append(str(forwarded_chat_id))
            for nested in value.values():
                visit(nested)
        elif isinstance(value, list):
            for nested in value:
                visit(nested)

    visit(payload)
    return found


class RubikaClient:
    def __init__(self, token: str | None = None, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.token = (token if token is not None else settings.rubika_bot_token).strip()
        self.transport = transport

    @property
    def available(self) -> bool:
        return bool(self.token)

    async def _request(self, method: str, payload: dict) -> RubikaSendResult:
        if not self.available:
            return RubikaSendResult(ok=False, error="Rubika token not configured")
        try:
            async with httpx.AsyncClient(timeout=20, transport=self.transport) as client:
                response = await client.post(f"https://botapi.rubika.ir/v3/{self.token}/{method}", json=payload)
                response.raise_for_status()
                body = response.json()
                if isinstance(body, dict):
                    api_status = str(body.get("status", "")).upper()
                    if api_status and api_status != "OK":
                        return RubikaSendResult(
                            ok=False,
                            raw=body,
                            error=str(body.get("status_det") or body.get("message") or api_status),
                        )
                return RubikaSendResult(ok=True, raw=body)
        except (httpx.HTTPError, ValueError) as exc:
            return RubikaSendResult(ok=False, error=str(exc))

    async def send_message(self, chat_id: str, text: str) -> RubikaSendResult:
        return await self._request("sendMessage", {"chat_id": chat_id, "text": text})

    async def get_updates(self, limit: int = 10, offset_id: str | None = None) -> RubikaSendResult:
        payload: dict[str, str | int] = {"limit": max(1, min(limit, 100))}
        if offset_id:
            payload["offset_id"] = offset_id
        return await self._request("getUpdates", payload)


async def get_all_updates(
    client: RubikaClient | None = None,
    *,
    limit: int = 100,
    max_pages: int = 20,
) -> RubikaSendResult:
    rubika = client or RubikaClient()
    updates: list[object] = []
    offset_id: str | None = None
    seen_offsets: set[str] = set()

    for _ in range(max(1, max_pages)):
        result = await rubika.get_updates(limit=limit, offset_id=offset_id)
        if not result.ok:
            return result
        raw = result.raw or {}
        data = raw.get("data", raw) if isinstance(raw, dict) else {}
        page_updates = data.get("updates", []) if isinstance(data, dict) else []
        if isinstance(page_updates, list):
            updates.extend(page_updates)
        next_offset = str(data.get("next_offset_id") or "") if isinstance(data, dict) else ""
        if not next_offset or next_offset == offset_id or next_offset in seen_offsets:
            break
        seen_offsets.add(next_offset)
        offset_id = next_offset

    return RubikaSendResult(ok=True, raw={"status": "OK", "data": {"updates": updates}})
