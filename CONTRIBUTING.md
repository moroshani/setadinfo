# Contributing

Thanks for helping improve SetadInfo.

## Development

1. Install backend dependencies from `backend/requirements.txt`.
2. Enable Corepack and install frontend dependencies in `frontend-workbench/`
   with `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to a local `.env` and use fake/local secrets.
4. Run focused tests before opening a pull request.

## Expected Checks

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
DATABASE_URL=sqlite:///./tmp-contributor-migration.db python -m alembic -c alembic.ini upgrade head
cd frontend-workbench
pnpm audit --audit-level=high
pnpm lint
pnpm exec playwright install chromium
pnpm test
pnpm build
pnpm verify:demo
```

UI changes should include desktop and mobile screenshot QA using sanitized demo
data. See `docs/demo-data.md` and
`frontend-workbench/scripts/capture-public-screenshots.mjs`.

Changes to routes, data adapters, or the public lab must keep the browser-only
boundary intact: no `/api`, Setad, or Rubika request may leave the demo. The
`verify:demo` command enforces this boundary while exercising every main route
at desktop and mobile widths.

## Pull Requests

- Keep changes scoped.
- Add tests for backend behavior changes.
- Do not include private operational files or real recipient IDs.
- Keep Persian copy and the RTL-first interaction model intact unless the issue
  explicitly changes them.
- Disclose material AI assistance in the pull request. The contributor remains
  responsible for review, provenance, security, and every submitted change.
- Read `AGENTS.md` before making AI-assisted changes.
