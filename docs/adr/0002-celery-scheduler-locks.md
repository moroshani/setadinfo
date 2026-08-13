# ADR 0002: Celery Scheduler With Per-Monitor Locks

## Status

Accepted

## Decision

Keep Celery worker/beat and add a per-monitor lock so the same monitor cannot run concurrently.

## Consequences

- Beat may check due monitors every minute.
- Each monitor can still have its own interval.
- Duplicate enqueue pressure is reduced by refreshing `next_run_at` before enqueue and locking in the worker.
