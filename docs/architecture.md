# Architecture

SetadInfo is an open-source Persian/RTL workbench for searching and monitoring
public Setad central-board opportunities. A private operational deployment may
connect to real infrastructure; the public GitHub Pages lab is a separate,
synthetic browser-only build.

## Runtime Boundaries

- The normal frontend calls only the same-origin FastAPI `/api` surface.
- FastAPI owns authentication, RBAC, persistence, live-search orchestration, and
  integration access.
- Workers call the public Setad gateway and optional Rubika provider from the
  server side only.
- Public-demo mode intercepts the frontend API adapter before `fetch`, uses
  synthetic in-memory state, and calls no backend or external provider.

## Services

- `web`: React/Vite workbench served by Nginx in full-stack deployments.
- `api`: FastAPI app for auth, task CRUD, metadata lookup, dashboard stats, results, and manual runs.
- `worker`: Celery worker for polling Setad, storing snapshots, offer-history refreshes, and notifications.
- `beat`: Celery scheduler that checks due tasks once per minute.
- `db`: PostgreSQL.
- `redis`: Celery broker/result backend.
- `pages-demo`: static Vite build with synthetic data and hash routing; no
  backend service.

## Data Model

- `monitor_tasks`: saved user tasks. The complete filter object is stored as JSON.
- `task_runs`: one row per scheduled/manual run.
- `listings`: normalized Setad opportunity fields plus full raw JSON.
- `task_matches`: join table showing which listing matched which task and when.
- `offers`: offer-history rows for listings, normalized where possible and raw JSON preserved.
- `notification_events`: durable baseline and meaningful-change cards.
- `notification_deliveries`: per-destination delivery state and attempts.
- `rubika_recipients`: configured notification destinations.
- `users`: authenticated identities and `admin`, `operator`, or `viewer` roles.

Alembic owns schema evolution. New model fields or tables require a migration,
backend tests, and a fresh-database upgrade check.

## Scaling Path

The first VPS deployment runs all containers on one server. Scaling up is straightforward:

1. Increase `worker` replicas.
2. Move PostgreSQL/Redis to managed or dedicated hosts.
3. Add DB indexes for high-volume search.
4. Split browser scraping fallback into a separate worker queue.
5. Add per-user resource ownership if the current role-level boundary evolves
   into a multi-tenant model.
