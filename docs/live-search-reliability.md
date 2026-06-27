# Live Search Reliability

## Request Route

Production browser requests go to `/api/live/search` on the SetadInfo VPS.
Only the VPS API calls the public Setad gateway. The browser does not call
Setad directly, and local development must not probe Setad through the Happ
tunnel.

## Retry Policy

The Setad client retries up to three times for:

- HTTP 429, 500, 502, 503, and 504
- timeouts
- connection and network failures
- protocol disconnects

Non-transient 4xx responses are not retried. Exhausted retries return a
controlled 502 or 504 JSON response to the UI. Invalid filter combinations
rejected by Setad return a controlled 422 response instead of an internal
server error.

The per-attempt timeout is 15 seconds. Three attempts plus backoff finish
inside the 90-second Nginx proxy window, preventing the previous condition
where the proxy timed out just before the backend exhausted its retries.

## Cache And Public Quota

Successful Setad GET responses are stored in Redis:

- fresh cache: 60 seconds;
- stale fallback: 24 hours.

Strict keyword searches also store the complete normalized result set as a
query-level snapshot. Pagination is served from that snapshot, so moving
between pages or repeating the same search does not rescan every Setad
candidate page. If Setad later returns a quota or transport error, the latest
snapshot is used as a stale result.

Setad sometimes returns HTTP 428 when its public-board request allowance is
active. That response is not retried. The API returns the stale cached result
when one exists; otherwise it returns HTTP 429 with code
`setad_public_limit`. The UI labels results as live, fresh-cache, or
stale-cache data.

Transient 429/5xx and transport failures still use the normal retry policy,
then fall back to stale cache when possible.

## Search Semantics

- The default sort is Setad relevance (`score`).
- The dashboard requests five rows per page, matching the public board.
- Setad is treated as a candidate source for every title-keyword search.
- One or more positive keywords must all appear in the normalized title.
  SetadInfo scans the candidate pages and produces its own exact total and
  pagination.
- Negative title keywords are applied as ANY-match exclusions. If any excluded
  term appears in the title, the row is rejected. Searches with exclusions
  scan candidate pages and produce exact filtered totals and pagination.
- Persian/Arabic yeh, kaf, Alef variants, whitespace, and zero-width
  characters are normalized for positive and negative title matching.
- Exact trade-number search uses Setad's exact-number mode and is not title
  filtered.

Live totals are time-dependent. A screenshot count is not a durable expected
value; parity is tested by comparing SetadInfo with the official gateway using
the same filters at the same time.

## UI Consistency

Every new live request:

1. aborts the previous browser request;
2. clears the previous rows and counts;
3. accepts results only from the newest request;
4. shows a source/loading/success/error status;
5. offers an explicit retry after failure.

Typed keyword text is added to the keyword list automatically when Search or
Save Monitor is clicked. This prevents the input from looking active while
being absent from the submitted filter payload.

The positive keyword, negative keyword, and table-search inputs are
credential-autofill-safe. Login inputs use explicit username/password
autocomplete semantics, while search inputs are read-only until focused and
carry non-credential field metadata. This prevents Chrome/password managers
from injecting the admin username into filter fields.

The table search is available in both modes:

- live mode filters the currently loaded Setad page locally;
- stored mode searches the full stored result set on the server.

## Stored Results

Stored results exist only when a monitor has matched a listing. The dashboard
count and `/api/listings` exclude orphan rows. Deleting a monitor removes
listings that no other monitor references.

The PostgreSQL query uses `EXISTS` against monitor matches. It does not apply
`DISTINCT` to the full listing row because listings include a JSON payload,
which PostgreSQL cannot compare with a plain equality operator.

`/api/listings` supports server-side:

- `page` and `page_size`
- `q`
- `board_code`
- `sort_by`
- `sort_dir`
- `task_id`

## Verification

Run backend and frontend checks:

```powershell
$env:PYTHONPATH='backend'
python -m unittest discover -s backend/tests -v
cd frontend
npm run lint
npm run build
```

Run authenticated production desktop QA with `QA_USERNAME` and `QA_PASSWORD`
set:

```powershell
cd frontend
node scripts/qa-live-search.mjs
node scripts/qa-production-integration.mjs
```

The runner verifies empty autofill-safe fields, live table search,
pending-keyword submission, strict matching titles, page 2, forced failure
clearing, retry recovery, filter API behavior, console errors, layout
overflow, control clipping, and writes a full-page screenshot.

The production integration runner also verifies:

- two similar filter monitors persist independently;
- a single-item monitor retains stable Setad identifiers;
- monitor editing and deletion;
- multi-keyword AND totals and pagination;
- stored-results empty pagination;
- offer-history API behavior;
- controlled Setad quota/rejection errors;
- full-page listing details;
- cleanup back to the initial database counts.

The direct parity runner is `backend/app/parity_audit.py`. Its dated output is
stored under `qa/`.
