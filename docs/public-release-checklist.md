# Public Release Checklist

Updated: 2026-06-20

Use this checklist before creating or pushing the dedicated public repository.

## Must Exclude

- `.ops-private/`
- `.env` and all real environment files
- VPS IPs, SSH keys, known-hosts files, and deployment-only scripts
- Rubika tokens, chat IDs, delivery logs, or screenshots with private chats
- Database dumps, production exports, archives, and private QA artifacts
- User-supplied commercial font binaries unless redistribution rights are
  confirmed

## Must Include

- Sanitized backend, frontend, docs, Docker Compose, and tests
- `.env.example` with local-only placeholder values
- `LICENSE`, `NOTICE`, `SECURITY.md`, `CONTRIBUTING.md`, and
  `CODE_OF_CONDUCT.md`
- GitHub Actions for backend tests and frontend lint/build
- Issue templates and pull request template
- Screenshots generated from fake/local data only
- Attribution for `satnaing/shadcn-admin` and other MIT/open-source sources

## Pre-Push Checks

- Run backend tests.
- Run `frontend-workbench` lint and production build.
- Search for obvious secret names and production-only values.
- Confirm ignored files stay ignored after copying into the public repo.
- Review `README.md` as if a new contributor is installing the app from zero.
