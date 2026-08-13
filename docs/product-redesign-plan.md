# Product Redesign Plan

SetadInfo should feel like an operational assistant, not raw Setad data exposed in screens.

## Core Promise

Tell the user what matters, why it matters, and what to do next.

## Workflows

- Home: needs attention, running normally, recent important changes, system health.
- Create Monitor: choose monitor type, build filters, preview results, choose schedule, preview notification, save.
- Monitors: active state, next run, last run, first-list status, health.
- Monitor Detail: watched filter, listings, updates, runs, deliveries.
- Notifications: human-readable cards with reason and before/after values.
- Listings: stored opportunities with detail drawers and Setad links.
- Runs: scheduler and upstream diagnostics.
- Destinations: Rubika destinations, test sending, active/inactive state.
- Users: admin/operator/viewer controls.

## UX Rules

- Persian and RTL are first-class.
- No raw event names as primary labels.
- No unexplained badges.
- No notification card without a reason.
- No “changed” message without before/after when the value is known.
- Empty, loading, error, success, and permission states must be intentional.
