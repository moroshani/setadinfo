from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class RubikaTestRequest(BaseModel):
    chat_id: str = ""
    text: str = "SetadInfo notification test"


class RubikaRecipientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    recipient_type: Literal["user", "chat", "channel"]
    chat_id: str = Field(min_length=1, max_length=160)
    enabled: bool = True


class RubikaRecipientUpdate(RubikaRecipientCreate):
    pass


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=10, max_length=200)
    role: Literal["admin", "operator", "viewer"] = "viewer"
    enabled: bool = True


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=10, max_length=200)
    role: Literal["admin", "operator", "viewer"]
    enabled: bool


class TaskFilters(BaseModel):
    monitorMode: Literal["filter", "item"] = "filter"
    searchTypeCode: int = 0
    keyword: str = ""
    keywords: list[str] = Field(default_factory=list)
    excludedKeywords: list[str] = Field(default_factory=list)
    sort: str = "score"
    boardCodes: list[int] = Field(default_factory=list)
    tagCodes: list[int] = Field(default_factory=list)
    selectedOrganization: list[str] = Field(default_factory=list)
    selectedCategory: list[int] = Field(default_factory=list)
    selectedProvinces: list[str] = Field(default_factory=list)
    selectedCities: list[str] = Field(default_factory=list)
    fromSendDeadlineDate: str = ""
    toSendDeadlineDate: str = ""
    fromDocumentDeadlineDate: str = ""
    toDocumentDeadlineDate: str = ""
    fromPrice: float | None = None
    toPrice: float | None = None
    classificationId: list[int] = Field(default_factory=list)
    notOrgId: list[str] = Field(default_factory=list)
    targetSourceKey: str = ""
    targetTradeNumber: str = ""
    targetPartyNumber: str = ""
    targetBoardCode: int | None = None
    targetTagCode: int | None = None

    @field_validator("fromPrice", "toPrice", mode="before")
    @classmethod
    def blank_price_to_none(cls, value):
        return None if value == "" else value


class TaskCreate(BaseModel):
    name: str
    description: str = ""
    enabled: bool = True
    interval_minutes: int = 60
    include_offers: bool = True
    notify_rubika: bool = False
    notify_initial: bool = True
    notify_new_listings: bool = True
    notify_listing_changes: bool = True
    notify_offer_changes: bool = True
    rubika_chat_id: str = ""
    recipient_ids: list[str] = Field(default_factory=list)
    filters: TaskFilters


class TaskUpdate(TaskCreate):
    pass


class LiveSearchRequest(BaseModel):
    filters: TaskFilters
    page: int = Field(default=0, ge=0)
    page_size: int = Field(default=50, ge=1, le=100)


class LiveOfferRequest(BaseModel):
    party_number: str = Field(min_length=1, max_length=120)
    board_code: int
    tag_code: int


class TaskOut(BaseModel):
    id: str
    name: str
    description: str
    enabled: bool
    interval_minutes: int
    include_offers: bool
    notify_rubika: bool
    notify_initial: bool
    notify_new_listings: bool
    notify_listing_changes: bool
    notify_offer_changes: bool
    rubika_chat_id: str
    recipient_ids: list[str]
    filters: dict[str, Any]
    created_at: datetime | None
    updated_at: datetime | None
    last_run_at: datetime | None
    next_run_at: datetime | None
    baseline_notified_at: datetime | None
    last_successful_run_id: int | None


class RunOut(BaseModel):
    id: int
    task_id: str
    started_at: datetime
    finished_at: datetime | None
    status: str
    message: str
    fetched_count: int
    matched_count: int
    changed_count: int
