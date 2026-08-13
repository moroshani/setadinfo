# Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
Always prefer MCP graph tools over grep/glob/file-search for code discovery.

## Priority Order

1. `search_graph` - find functions, classes, routes, variables by pattern
2. `trace_path` - trace who calls a function or what it calls
3. `get_code_snippet` - read specific function/class source code
4. `query_graph` - run Cypher queries for complex patterns
5. `get_architecture` - high-level project summary

## When To Fall Back To Grep/Glob

- Searching for string literals, error messages, config values
- Searching non-code files such as Dockerfiles, shell scripts, and configs
- When MCP tools return insufficient results

## Examples

- Find a handler: `search_graph(name_pattern=".*OrderHandler.*")`
- Who calls it: `trace_path(function_name="OrderHandler", direction="inbound")`
- Read source: `get_code_snippet(qualified_name="pkg/orders.OrderHandler")`

---

# SetadInfo Project Guide

## Start Here

1. Read `README.md` and `docs/README.md`.
2. Read `CONTRIBUTING.md` and the relevant product or operations document.
3. Inspect Git status before every edit.

## Local Worktree Safety

As of 2026-08-09, `C:\Projects\setadinfo` is the user's active unpublished
development checkout with substantial uncommitted notification and redesign
work. A complete snapshot is preserved on
`safety/local-snapshot-20260809` at `18a20a8`.

- Never reset, clean, checkout, pull, merge, or overwrite this worktree to make
  it match GitHub.
- Preserve the notification/redesign work and all untracked docs.
- The reconciled release candidate is
  `C:\Projects\setadinfo-reconcile-20260809` on
  `integrate/public-main-20260809`. It replays only the captured local work on
  top of public `main` and keeps the browser-only demo introduced at `e72218a`.
- Do not copy the release candidate over the active checkout. Move the active
  checkout only after the candidate is reviewed, published, and the dirty state
  is handled explicitly.

Index the current checkout before code discovery. Known graph names are
`SetadInfo-Portfolio` for the active checkout and
`setadinfo-reconciled-20260809` for the release candidate.

## Product Boundaries

- The product is Persian and RTL-first.
- Browser production code calls the same-origin FastAPI `/api` surface; Setad
  and Rubika access stays server-side.
- Official board codes are purchase `1`, tender `2`, and auction `3`.
- Monitoring is baseline plus meaningful delta; unchanged scheduled checks do
  not create user-facing notifications.
- Backend role checks for `admin`, `operator`, and `viewer` are authoritative.
- Never add real credentials, recipient IDs, private screenshots, database
  dumps, infrastructure secrets, or commercial font files.

## Verification

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
DATABASE_URL=sqlite:///./tmp-agent-migration.db python -m alembic -c alembic.ini upgrade head
cd frontend-workbench
corepack enable
pnpm install --frozen-lockfile
pnpm audit --audit-level=high
pnpm lint
pnpm test
pnpm build
pnpm verify:demo
```
