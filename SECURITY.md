# Security Policy

## Supported Versions

Security fixes target the latest public `main` branch unless a release branch
is explicitly marked as supported.

## Reporting A Vulnerability

Do not open a public issue for secrets, authentication bypasses, deployment
keys, or notification-token exposure. Use GitHub's
[private vulnerability reporting](https://github.com/moroshani/setadinfo/security/advisories/new)
to contact the maintainer confidentially.

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
