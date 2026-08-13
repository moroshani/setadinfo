# Architecture

SetadInfo is an open-source Persian/RTL workbench for searching and monitoring
public Setad central-board opportunities. A private operational deployment may
connect to real services; the public GitHub Pages lab is a separate synthetic
browser-only surface.

## Runtime Boundaries

- The normal frontend calls only the same-origin FastAPI `/api` surface.
- FastAPI owns authentication, RBAC, persistence, live-search orchestration, and
  provider access.
- Celery workers call Setad and optional Rubika integrations server-side.
- The public browser-only mode uses synthetic in-memory state and must make no
  backend or provider request. Its fixtures implement the current task,
  notification-card, and notification-preview contracts.

## Services

- `web`: React/Vite workbench served by Nginx.
- `api`: FastAPI app for auth, task CRUD, metadata lookup, dashboard stats, results, and manual runs.
- `worker`: Celery worker for polling Setad, storing snapshots, offer-history refreshes, and notifications.
- `beat`: Celery scheduler that checks due tasks once per minute.
- `db`: PostgreSQL.
- `redis`: Celery broker/result backend.
- `pages-demo`: static synthetic Vite build from the public branch; no backend.

## Data Model

- `monitor_tasks`: saved user tasks. The complete filter object is stored as JSON.
- `task_runs`: one row per scheduled/manual run.
- `listings`: normalized Setad opportunity fields plus full raw JSON.
- `task_matches`: join table showing which listing matched which task and when.
- `offers`: offer-history rows for listings, normalized where possible and raw JSON preserved.
- `notification_events`: user-facing baseline and meaningful-change cards.
- `notification_deliveries`: per-recipient delivery state, attempts, and retries.
- `rubika_recipients`: configured notification destinations.
- `users`: authenticated identities and role assignments.

Alembic owns schema evolution. The release candidate includes the notification
overhaul migration after the initial schema; both revisions must pass against a
fresh database before publication.

## Scaling Path

The first VPS deployment runs all containers on one server. Scaling up is straightforward:

1. Increase `worker` replicas.
2. Move PostgreSQL/Redis to managed or dedicated hosts.
3. Add DB indexes for high-volume search.
4. Split browser scraping fallback into a separate worker queue.
5. Add per-user resource ownership if role-level access evolves into a
   multi-tenant model.
