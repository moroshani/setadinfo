# Contributing

Thanks for helping improve SetadInfo.

## Development

1. Install backend dependencies from `backend/requirements.txt`.
2. Install frontend dependencies in `frontend/`.
3. Copy `.env.example` to a local `.env` and use fake/local secrets.
4. Run focused tests before opening a pull request.

## Expected Checks

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
cd frontend
npm run lint
npm run build
```

UI changes should include a full-page screenshot QA pass using
`frontend/scripts/capture-fullpage.mjs`.

## Pull Requests

- Keep changes scoped.
- Add tests for backend behavior changes.
- Do not include private operational files or real recipient IDs.
- Update `docs/agent-state.md` only for durable project milestones.
