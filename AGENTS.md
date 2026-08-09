# Agent Guide

This file gives coding agents and human contributors the minimum durable context
needed to work safely in SetadInfo. Read `README.md`, `docs/README.md`,
`CONTRIBUTING.md`, and the relevant document under `docs/` before changing
behavior.

## Repository Map

- `backend/`: FastAPI, SQLAlchemy, Celery, Setad and Rubika integrations.
- `frontend-workbench/`: React, TypeScript, Vite, TanStack Router and Query.
- `backend/migrations/`: Alembic schema migrations.
- `docs/`: product workflows, architecture, API contract, deployment, and demo
  data.
- `deploy/`: public deployment examples only; production operations stay out of
  this repository.
- `.github/workflows/demo.yml`: builds the browser-only lab and deploys it to
  GitHub Pages.

## Product Invariants

- The interface is Persian and RTL-first. The default document direction is
  `rtl`; accessibility names may intentionally remain explicit English where
  the settings surface uses English.
- Official Setad board codes are `1` for purchase (`خرید`), `2` for tender
  (`مناقصه`), and `3` for auction (`مزایده`). Keep parsing and labels centralized
  in `frontend-workbench/src/lib/setad-boards.ts`.
- Browser code calls the local `/api` surface. It must not call the public Setad
  gateway or messaging providers directly.
- Public-demo mode is the only exception to the local `/api` transport: it must
  resolve requests through `src/lib/public-demo-api.ts` before `fetch`, use only
  synthetic data, and make no network request to `/api`, Setad, or Rubika.
- Monitor behavior is baseline plus delta: the first successful run establishes
  state; later runs report meaningful changes.
- Role boundaries for `admin`, `operator`, and `viewer` must remain enforced in
  the backend, regardless of frontend visibility.
- Never add real credentials, recipient IDs, private screenshots, database
  dumps, commercial font files, or material from `.ops-private/`.

## Verification

Backend behavior or schema changes:

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
DATABASE_URL=sqlite:///./tmp-agent-migration.db python -m alembic -c alembic.ini upgrade head
```

Frontend changes:

```bash
cd frontend-workbench
corepack enable
pnpm install --frozen-lockfile
pnpm audit --audit-level=high
pnpm lint
pnpm exec playwright install chromium
pnpm test
pnpm build
pnpm verify:demo
```

Use focused tests while iterating, then run the complete relevant gate. For UI
changes, seed the sanitized demo database and inspect desktop and mobile
screenshots as described in `docs/demo-data.md`. Changes that affect routes,
API adapters, or layout must also pass `pnpm verify:demo`.

## Change Discipline

- Trace callers and API consumers before changing shared schemas, filters, or
  monitor semantics.
- Add a regression test that fails for the reported behavior before or alongside
  the fix.
- Keep generated files, lockfiles, migrations, and documentation synchronized
  with the source change that requires them.
- Do not rewrite unrelated files to satisfy formatting or cleanup tools. Record
  existing debt separately.
- AI assistance does not replace maintainer review. Explain material AI use and
  the verification performed in the pull request.
