# SetadInfo Workbench

This is the staged replacement frontend for SetadInfo, based on the
MIT-licensed `satnaing/shadcn-admin` dashboard template.

It is intentionally separate from `frontend/` while the migration is underway.
The current production frontend remains untouched until this workbench reaches
feature parity.

## Direction

- RTL-first Persian operations workbench.
- Real routes for search, monitors, updates, opportunities, runs, recipients,
  users, and settings.
- shadcn/ui + Radix + Tailwind components from the selected template.
- TanStack Router and React Query for route/data ownership.
- Notification UI built around info-card events: initial baseline, then only
  additions, removals, modifications, and auction offer changes.

## Template Attribution

This scaffold uses code from:

https://github.com/satnaing/shadcn-admin

Original template copyright:

Copyright (c) 2024 Sat Naing

