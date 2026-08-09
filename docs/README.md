# SetadInfo Documentation

This directory is the durable product and engineering memory for SetadInfo.

## Worktree State On 2026-08-09

- `C:\Projects\setadinfo` contains unpublished notification, delivery,
  reliability, operations, and frontend redesign work.
- `safety/local-snapshot-20260809` preserves the complete captured state at
  `18a20a8` without altering the active checkout.
- `C:\Projects\setadinfo-reconcile-20260809` contains the release candidate on
  `integrate/public-main-20260809`, based on public `main` with the local
  notification/redesign work replayed once.
- Do not reset, pull, merge, or copy either worktree over the active checkout.
  Publish and review the release candidate before moving the active checkout.

## Current Public Surface

- Repository: `https://github.com/moroshani/setadinfo`
- Synthetic lab: `https://moroshani.github.io/setadinfo/`
- The lab is browser-only, uses synthetic data and in-memory mutations, and has
  no access to the private production deployment.

## Product And Engineering

- [Architecture](./architecture.md)
- [Product workflows](./product-workflows.md)
- [Product redesign plan](./product-redesign-plan.md)
- [Notification policy](./notification-policy.md)
- [API contract](./api-contract.md)
- [Live-search reliability](./live-search-reliability.md)
- [Demo data](./demo-data.md)
- [Architecture decisions](./adr/)

## Operations And Release

- [Operations runbook](./operations-runbook.md)
- [Deployment](./deployment.md)
- [Migrations](./migrations.md)
- [Rubika behavior](./rubika.md)
- [Rubika setup](./rubika-setup.md)
- [Public release checklist](./public-release-checklist.md)
- [Setad gateway research](./setad-research.md)

## Maintenance Rules

- Keep local unpublished state and deployed public state explicitly separated.
- Update API, notification, migration, and operations docs with the behavior
  change that requires them.
- Use concrete dates for worktree state.
- Never record production credentials, recipient IDs, private infrastructure,
  database dumps, or private screenshots.
