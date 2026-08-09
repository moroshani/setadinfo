# SetadInfo Workbench

This is the canonical React frontend for SetadInfo, based on the MIT-licensed
`satnaing/shadcn-admin` dashboard template and adapted into a Persian,
RTL-first operational workbench.

## Direction

- RTL-first Persian operations workbench.
- Real routes for search, monitors, updates, opportunities, runs, recipients,
  users, and settings.
- shadcn/ui + Radix + Tailwind components from the selected template.
- TanStack Router and React Query for route/data ownership.
- Notification UI built around info-card events: initial baseline, then only
  additions, removals, modifications, and auction offer changes.

## Runtime Modes

- Normal development and production builds call the same-origin FastAPI `/api`
  surface. Browser code never calls Setad or Rubika directly.
- Public-demo mode uses `src/lib/public-demo-api.ts`, synthetic data, in-memory
  mutations, and hash routing. It makes no backend or provider request.

## Commands

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm verify:demo
```

The public lab is deployed at `https://moroshani.github.io/setadinfo/`. See
`../docs/demo-data.md` for the browser-only safety boundary and the separate
full-stack seeded-data workflow.

## Template Attribution

This scaffold uses code from:

https://github.com/satnaing/shadcn-admin

Original template copyright:

Copyright (c) 2024 Sat Naing
