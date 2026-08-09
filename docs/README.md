# SetadInfo Documentation

This directory is the durable product, architecture, safety, and operations
memory for SetadInfo. Keep it synchronized with behavior changes in the same
commit.

## Current State

- Baseline date: 2026-08-09.
- Public source branch: `main` at the browser-demo publication line beginning
  with `e72218a`.
- Public lab: `https://moroshani.github.io/setadinfo/`.
- The lab is static, browser-only, synthetic, uses in-memory mutations, and must
  make no `/api`, Setad, or Rubika request.
- The full-stack product remains FastAPI, PostgreSQL, Redis, Celery, React,
  TypeScript, Vite, TanStack Router, and TanStack Query.
- Last complete published verification: 51 backend tests, 87 frontend tests,
  fresh SQLite migration, lint, production and demo builds, responsive demo QA,
  and zero known high-severity frontend audit findings.
- No tagged SetadInfo source release exists yet.

## Read First

- [Architecture](./architecture.md)
- [Product workflows](./product-workflows.md)
- [API contract](./api-contract.md)
- [Demo data and public lab](./demo-data.md)
- [Deployment](./deployment.md)
- [Migrations](./migrations.md)
- [Live-search reliability](./live-search-reliability.md)
- [Public release checklist](./public-release-checklist.md)

## Integrations And Research

- [Rubika behavior](./rubika.md)
- [Rubika setup](./rubika-setup.md)
- [Setad gateway research](./setad-research.md)

## Maintenance Rules

- Update the API contract when request or response shapes change.
- Update architecture and deployment docs when service boundaries change.
- Update demo documentation whenever a route or adapter is added.
- Use concrete dates and distinguish deployed public behavior from planned work.
- Never include production credentials, recipient IDs, private screenshots,
  database dumps, infrastructure addresses, or commercial font files.
