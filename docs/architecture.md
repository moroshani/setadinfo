# Architecture

SetadInfo is a private monitoring system for public Setad central-board opportunities.

## Services

- `web`: static React dashboard served by Nginx.
- `api`: FastAPI app for auth, task CRUD, metadata lookup, dashboard stats, results, and manual runs.
- `worker`: Celery worker for polling Setad, storing snapshots, offer-history refreshes, and notifications.
- `beat`: Celery scheduler that checks due tasks once per minute.
- `db`: PostgreSQL.
- `redis`: Celery broker/result backend.

## Data Model

- `monitor_tasks`: saved user tasks. The complete filter object is stored as JSON.
- `task_runs`: one row per scheduled/manual run.
- `listings`: normalized Setad opportunity fields plus full raw JSON.
- `task_matches`: join table showing which listing matched which task and when.
- `offers`: offer-history rows for listings, normalized where possible and raw JSON preserved.

## Scaling Path

The first VPS deployment runs all containers on one server. Scaling up is straightforward:

1. Increase `worker` replicas.
2. Move PostgreSQL/Redis to managed or dedicated hosts.
3. Add DB indexes for high-volume search.
4. Split browser scraping fallback into a separate worker queue.
5. Add per-user ownership fields and RBAC when multi-user mode is needed.

