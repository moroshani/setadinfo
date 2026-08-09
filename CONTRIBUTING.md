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
pnpm test
pnpm build
pnpm verify:demo
```

UI changes should include desktop and mobile browser QA with sanitized data when
the visible workflow changes. `pnpm verify:demo` must confirm that the static
demo does not make backend, Setad, or Rubika requests.

## Pull Requests

- Keep changes scoped.
- Add tests for backend behavior changes.
- Do not include private operational files or real recipient IDs.
- Update documentation when APIs, operations, or notification behavior changes.
- Disclose material AI assistance and remain responsible for every submitted
  change and verification claim.
