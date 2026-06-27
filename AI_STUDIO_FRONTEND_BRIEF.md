# AI Studio Frontend Redesign Brief

This repository is ready to hand to Google AI Studio for a full frontend UX/UI
redesign. The current workbench is functional, but the desired next step is a
complete product-design pass, not a cosmetic theme change.

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

The user does not want a landing page or a one-page demo. They want a real
dashboard/workbench optimized for repeated operational use.

## Redesign Scope

You may redesign the frontend UI and UX from scratch.

Keep:

- `frontend-workbench` as the frontend package unless there is a strong reason
  to migrate;
- React + TypeScript + Vite;
- RTL/Persian-first product behavior;
- the FastAPI backend API contract under `/api`;
- authentication flow based on server session cookies;
- the core routes listed below.

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

## Core Routes

Current route intent:

- `/sign-in`: login.
- `/`: operational overview.
- `/search`: live search and save-as-monitor flow.
- `/monitors`: monitor list and actions.
- `/monitors/:taskId`: monitor detail, baseline, listings, updates, runs.
- `/updates`: event inbox for baseline/new/changed/offer events.
- `/opportunities`: stored listing database.
- `/runs`: scheduler run diagnostics.
- `/recipients`: Rubika destinations and test sending.
- `/users`: admin-only user management.
- `/settings/*`: local appearance, notification policy, account/system notes.

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
7. The interface should be comfortable for Persian text, long organization
   names, long tender titles, numbers, dates, and mixed Persian/English text.

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

## Backend API

Start with:

- `frontend-workbench/src/lib/setad-api.ts`
- `backend/app/main.py`
- `backend/app/schemas.py`

The frontend already calls the backend through `/api`. Do not call Setad
directly from the browser.

## How To Run

Backend:

```bash
python -m pip install -r backend/requirements.txt
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Frontend:

```bash
cd frontend-workbench
pnpm install
pnpm dev --host 127.0.0.1 --port 5180
```

Validation:

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
cd frontend-workbench
pnpm lint
pnpm build
```

## Public Repo Safety

Do not add production secrets, real Rubika tokens, chat IDs, SSH keys, database
dumps, `.env` files, private screenshots, or commercial font files.

