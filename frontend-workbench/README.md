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

## Runtime Boundary

Normal development and production builds call only the same-origin FastAPI
`/api` surface. Browser code must not call Setad or Rubika directly.

The public repository also has a browser-only synthetic mode deployed at
`https://moroshani.github.io/setadinfo/`. It uses in-memory synthetic data,
supports the current notification-card workflow, and must never call a backend,
Setad, or Rubika endpoint.

## Commands

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm verify:demo
```

## Template Attribution

This scaffold uses code from:

https://github.com/satnaing/shadcn-admin

Original template copyright:

Copyright (c) 2024 Sat Naing
