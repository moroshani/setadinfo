# Security Policy

## Supported Versions

Security fixes target the latest public `main` branch unless a release branch
is explicitly marked as supported.

## Reporting A Vulnerability

Do not open a public issue for secrets, authentication bypasses, deployment
keys, or notification-token exposure. Report privately to the maintainer listed
in the public repository profile.

Please include:

- affected version or commit;
- deployment mode;
- steps to reproduce;
- impact;
- any logs with secrets removed.

## Secrets

Never commit:

- `.env` files except `.env.example`;
- `.ops-private/`;
- VPS SSH keys or host fingerprints;
- production database dumps;
- Rubika bot tokens or chat IDs;
- Setad credentials.
