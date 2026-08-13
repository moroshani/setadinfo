# Changelog

All notable changes to SetadInfo are recorded here.

## Unreleased

- Overhauled notification semantics around one baseline summary and meaningful follow-up changes.
- Added canonical event types for listings, auction offers, run failures, and monitor attention states.
- Added field-aware listing and offer diffs so change messages can show before/after values.
- Added notification cards, delivery attempts, delivery retry surfaces, and system status APIs.
- Lowered the default minimum monitor interval to 5 minutes.
- Added CodeQL, Dependabot, and expanded public-repo hygiene documentation.
- Reconciled the notification redesign with the synthetic browser-only GitHub
  Pages lab at `https://moroshani.github.io/setadinfo/`.
- Updated the public demo fixtures for notification cards, task baselines, event
  policy fields, and browser-only notification previews.
