# ADR 0003: Public Repository Hygiene

## Status

Accepted

## Decision

The public repository must contain only source, documentation, test fixtures, and public-safe assets.

## Consequences

- No real `.env` files, Rubika tokens, chat IDs, SSH keys, dumps, or private screenshots.
- CI includes public-safety checks.
- Local agent state such as `.codebase-memory/` stays ignored.
