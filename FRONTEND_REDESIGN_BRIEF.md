# Frontend Redesign Brief

This brief describes the intended next UX/UI direction for SetadInfo. It can be
used by a human designer, a frontend engineer, Google AI Studio, or any other
design/code agent. The goal is the product, not the tool.

## Product Goal

SetadInfo is a Persian, RTL-first monitoring workbench for public Setad tenders
and auctions. Users should be able to:

- search public Setad opportunities with precise filters;
- save a search as a monitor;
- understand the first baseline list;
- receive and review only later changes;
- inspect auction offers and offer changes;
- manage Rubika notification destinations;
- diagnose scheduled monitor runs;
- manage users and roles.

This should feel like an operational dashboard/workbench for repeated daily
use, not a landing page, marketing site, or one-page demo.

## Redesign Scope

The frontend UX and UI can be redesigned from scratch.

Keep:

- `frontend-workbench` as the frontend package unless a migration is clearly
  worth it;
- React + TypeScript + Vite;
- RTL/Persian-first product behavior;
- the FastAPI backend API contract under `/api`;
- authentication based on server session cookies;
- the core jobs listed below.

You may change:

- route layout and navigation;
- information architecture;
- page composition;
- component hierarchy;
- visual system;
- CSS/Tailwind organization;
- frontend state/query structure;
- copy and microcopy.

Avoid:

- marketing-style hero pages;
- decorative dashboards that hide the operational workflow;
- fake template pages;
- one-note color palettes;
- designs that only work in LTR;
- oversized cards for dense operational data.

## Core Product Jobs

- Login.
- Operational overview.
- Live search and save-as-monitor flow.
- Monitor list and monitor actions.
- Monitor detail: baseline, listings, updates, and runs.
- Event inbox for baseline/new/changed/offer events.
- Stored listing database.
- Scheduler run diagnostics.
- Rubika destinations and test sending.
- Admin-only user management.
- Basic settings for appearance, notification policy, and account/system notes.

Routes can be renamed if the UX becomes clearer, but the workbench must still
cover these jobs.

## UX Priorities

1. Search should feel like an expert filter builder, not a form dump.
2. Monitor creation should make the baseline/delta behavior obvious.
3. Updates should read as useful information cards with enough context to act.
4. Auction offer changes should be visible and understandable.
5. Run diagnostics should make failures easy to triage.
6. Users should be able to move from a notification to its listing, monitor,
   run, and external Setad page.
7. The interface should handle Persian text, long organization names, long
   tender titles, numbers, dates, and mixed Persian/English text gracefully.

## Design System Expectations

- Persian RTL is the default.
- English text uses Inter; Persian deployments may self-host a licensed Persian
  font outside the public repo.
- Use dense but calm dashboard patterns.
- Favor tables, split panes, toolbars, side panels, command palettes, and
  inspector drawers where they reduce friction.
- Reuse one coherent component system across the app.
- Keep mobile usable, but optimize first for desktop operations.
- Keep accessibility and keyboard navigation in mind.

## Backend API Starting Points

- `frontend-workbench/src/lib/setad-api.ts`
- `backend/app/main.py`
- `backend/app/schemas.py`

The frontend already calls the backend through `/api`. Do not call Setad
directly from the browser.

## Validation

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
cd frontend-workbench
pnpm lint
pnpm build
```

## Public Repo Safety

Do not add production secrets, real Rubika tokens, chat IDs, SSH keys, database
dumps, `.env` files, private screenshots, or commercial font files.

