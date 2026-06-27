# Frontend API Contract

This document freezes the current HTTP contract used by `frontend-workbench`.
When backend responses or request shapes change, update this file and
`frontend-workbench/src/lib/setad-api.ts` in the same pull request.

## Contract Rules

- API base path is `/api`.
- Browser requests use cookie sessions with `credentials: include`.
- Auth cookie name is `setadinfo_session`; it is HTTP-only and valid for seven
  days.
- JSON request bodies use `Content-Type: application/json`.
- Successful responses are JSON.
- Errors use FastAPI style JSON: `{ "detail": "message" }`.
- Dates/times are serialized as ISO datetime strings unless the source Setad
  field is already Jalali text.
- Lists that are not paginated return `{ "items": [...] }`.
- Paginated responses return `{ items, page, page_size, total_elements,
  total_pages }`.

## Roles And Visibility

Roles:

- `admin`: full access, including users and Rubika recipient writes.
- `operator`: can create/manage own monitor tasks and only sees data connected
  to owned tasks.
- `viewer`: read-only; cannot create, update, delete, or run monitor tasks.

Operator restrictions apply to tasks, task runs, notification events, listings,
and listing offers.

## Shared Types

### User

```ts
type UserRole = 'admin' | 'operator' | 'viewer'

type WorkbenchUser = {
  id: string
  username: string
  role: UserRole
  enabled: boolean
  created_at: string
  updated_at: string | null
}
```

### TaskFilters

```ts
type TaskFilters = {
  monitorMode: 'filter' | 'item'
  searchTypeCode: number
  keyword: string
  keywords: string[]
  excludedKeywords: string[]
  sort: string
  boardCodes: number[]
  tagCodes: number[]
  selectedOrganization: string[]
  selectedCategory: number[]
  selectedProvinces: string[]
  selectedCities: string[]
  fromSendDeadlineDate: string
  toSendDeadlineDate: string
  fromDocumentDeadlineDate: string
  toDocumentDeadlineDate: string
  fromPrice: number | null
  toPrice: number | null
  classificationId: number[]
  notOrgId: string[]
  targetSourceKey: string
  targetTradeNumber: string
  targetPartyNumber: string
  targetBoardCode: number | null
  targetTagCode: number | null
}
```

### MonitorTask

```ts
type MonitorTask = {
  id: string
  name: string
  description: string
  enabled: boolean
  interval_minutes: number
  include_offers: boolean
  notify_rubika: boolean
  notify_initial: boolean
  notify_new_listings: boolean
  notify_listing_changes: boolean
  notify_offer_changes: boolean
  rubika_chat_id: string
  recipient_ids: string[]
  owner_id: string | null
  filters: Record<string, unknown>
  created_at: string
  updated_at: string | null
  last_run_at: string | null
  next_run_at: string | null
  baseline_notified_at: string | null
  last_successful_run_id: number | null
}
```

### Listing

```ts
type Listing = {
  id: number
  source_key: string
  trade_number: string
  board_code: number | null
  tag_code: number | null
  party_number: string
  title: string
  description: string
  organization: string
  province: string
  city: string
  category: string
  send_deadline: string
  document_deadline: string
  price: number | null
  detail_url: string
  raw: Record<string, unknown>
  content_hash: string
  first_seen_at: string
  last_seen_at: string
}
```

### Offer

```ts
type Offer = {
  id: number
  listing_id: number
  source_key: string
  bidder_name: string
  amount: number | null
  submitted_at: string
  status: string
  rank: string
  raw: Record<string, unknown>
  content_hash: string
  first_seen_at: string
  last_seen_at: string
}
```

### TaskRun

```ts
type TaskRun = {
  id: number
  task_id: string
  started_at: string
  finished_at: string | null
  status: string
  message: string
  fetched_count: number
  matched_count: number
  changed_count: number
}
```

### NotificationEvent

```ts
type NotificationEvent = {
  id: number
  task_id: string
  run_id: number
  listing_id: number | null
  offer_id: number | null
  event_type: string
  severity: string
  title: string
  summary: string
  payload: Record<string, unknown>
  created_at: string
}
```

Known `event_type` values are:

- `initial_listing`
- `new_listing`
- `listing_changed`
- `offer_new`
- `offer_changed`

### RubikaRecipient

```ts
type RubikaRecipient = {
  id: string
  name: string
  recipient_type: 'user' | 'chat' | 'channel'
  chat_id: string
  enabled: boolean
  created_at: string
  updated_at: string | null
}
```

## Endpoint Contract

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | public | none | `{ ok: true, service: "setadinfo" }` |
| `POST` | `/api/auth/login` | public | `{ username, password }` | `{ ok: true }` and sets session cookie |
| `POST` | `/api/auth/logout` | user | `{}` | `{ ok: true }` and clears session cookie |
| `GET` | `/api/auth/me` | user | none | `{ ok, id, username, role }` |
| `GET` | `/api/users` | admin | none | `{ items: WorkbenchUser[] }` |
| `POST` | `/api/users` | admin | `{ username, password, role, enabled }` | `WorkbenchUser` |
| `PUT` | `/api/users/{user_id}` | admin | `{ password?, role, enabled }` | `WorkbenchUser` |
| `GET` | `/api/meta/filters` | user | none | `{ sortOptions, searchTypeOptions, boardOptions, tagLabels }` |
| `GET` | `/api/meta/categories` | user | `search?, page?, page_size?` | Setad lookup response |
| `GET` | `/api/meta/organizations` | user | `search?, page?, page_size?` | Setad lookup response |
| `GET` | `/api/meta/cities` | user | `parent_loc_id?, page?, page_size?` | Setad lookup response |
| `POST` | `/api/live/search` | user | `{ filters: TaskFilters, page?, page_size? }` | `PageResponse<Listing>` |
| `POST` | `/api/live/offers` | user | `{ party_number, board_code, tag_code }` | `{ items: Offer[] }` |
| `GET` | `/api/integrations/rubika/status` | user | none | `{ configured, default_chat_configured }` |
| `GET` | `/api/integrations/rubika/chats` | user | none | `{ items, raw }` from Rubika updates |
| `POST` | `/api/integrations/rubika/test` | admin | `{ chat_id, text }` | `{ ok: true, result }` |
| `GET` | `/api/integrations/rubika/recipients` | user | none | `{ items: RubikaRecipient[] }` |
| `POST` | `/api/integrations/rubika/recipients` | admin | `{ name, recipient_type, chat_id, enabled }` | `RubikaRecipient` |
| `PUT` | `/api/integrations/rubika/recipients/{recipient_id}` | admin | `{ name, recipient_type, chat_id, enabled }` | `RubikaRecipient` |
| `DELETE` | `/api/integrations/rubika/recipients/{recipient_id}` | admin | none | `{ ok: true }` |
| `GET` | `/api/dashboard` | user | none | `{ stats, tasks }` |
| `GET` | `/api/tasks` | user | none | `{ items: MonitorTask[] }` |
| `POST` | `/api/tasks` | admin/operator | `TaskCreate` | `MonitorTask` |
| `PUT` | `/api/tasks/{task_id}` | task owner/admin | `TaskCreate` | `MonitorTask` |
| `DELETE` | `/api/tasks/{task_id}` | task owner/admin | none | `{ ok: true }` |
| `POST` | `/api/tasks/{task_id}/run` | task owner/admin | `{}` | `{ ok: true, queued: true }` |
| `GET` | `/api/runs` | user | `task_id?` | `{ items: TaskRun[] }` |
| `GET` | `/api/notifications` | user | `task_id?, limit?` | `{ items: NotificationEvent[] }` |
| `GET` | `/api/listings` | user | `task_id?, q?, board_code?, sort_by?, sort_dir?, page?, page_size?` | `PageResponse<Listing>` |
| `GET` | `/api/listings/{listing_id}` | user | none | `{ listing: Listing, offers: Offer[] }` |
| `GET` | `/api/listings/{listing_id}/offers` | user | none | `{ items: Offer[] }` |
| `GET` | `/api/export/tasks` | user | none | `MonitorTask[]` |

## TaskCreate

`POST /api/tasks` and `PUT /api/tasks/{task_id}` use the same request shape:

```ts
type TaskCreate = {
  name: string
  description: string
  enabled: boolean
  interval_minutes: number
  include_offers: boolean
  notify_rubika: boolean
  notify_initial: boolean
  notify_new_listings: boolean
  notify_listing_changes: boolean
  notify_offer_changes: boolean
  rubika_chat_id: string
  recipient_ids: string[]
  filters: TaskFilters
}
```

Backend clamps `interval_minutes` to at least `SETAD_MIN_INTERVAL_MINUTES`.

## Query Details

### `/api/listings`

Defaults:

- `page=0`
- `page_size=25`
- `sort_by=last_seen_at`
- `sort_dir=desc`

Allowed `sort_by` values:

- `last_seen_at`
- `trade_number`
- `title`
- `organization`
- `send_deadline`
- `price`

### `/api/notifications`

Defaults:

- `limit=100`

Limits:

- `1 <= limit <= 300`

## Stable Change Policy

For the frontend rebuild:

- Additive response fields are allowed.
- Removing or renaming fields requires updating this document, backend tests,
  and `frontend-workbench/src/lib/setad-api.ts`.
- Do not change auth semantics without updating route guards and this document.
- Do not call public Setad APIs directly from the browser.
- Keep operator visibility filtering in the backend.

