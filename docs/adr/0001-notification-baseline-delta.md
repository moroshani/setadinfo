# ADR 0001: First List And Change Notifications

## Status

Accepted

## Decision

Each monitor captures a first successful list, then creates user-facing events only for meaningful future changes.

## Consequences

- The first list is one summary event.
- Unchanged scheduled checks do not notify.
- Listing and offer changes use field-aware diffs.
- Delivery failures do not recreate events.
