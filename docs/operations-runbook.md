# Operations Runbook

## Start

```bash
cp .env.example .env
docker compose config --quiet
docker compose up -d --build
```

If the VPS has unreliable access to Docker Hub, PyPI, or npm, set the mirror
variables in `.env` before building:

- `PYTHON_IMAGE`, `NODE_IMAGE`, `NGINX_IMAGE`, `POSTGRES_IMAGE`, `REDIS_IMAGE`
- `PIP_INDEX_URL`, optional `PIP_TRUSTED_HOST`
- `PNPM_REGISTRY`

## Health Checks

- API: `GET /api/health`
- System: `GET /api/system/status`
- Docker: `docker compose ps`
- Logs: `docker compose logs -f api worker beat`

## Scheduled Monitoring

Celery beat checks due monitors once per minute. Each monitor stores its own next run time. The default minimum interval is 5 minutes.

Worker behavior:

- acquire a per-monitor lock;
- create a task run;
- fetch Setad pages;
- store listings/offers;
- create notification events/cards only for meaningful changes;
- create pending deliveries;
- send Rubika messages and record attempts;
- refresh the next run time.

## Delivery Retry

Failed delivery rows are visible through `GET /api/deliveries`. Admins can retry a delivery with `POST /api/deliveries/{id}/retry`.

## Backup

Back up PostgreSQL before migrations or deployment:

```bash
docker compose exec db pg_dump -U setadinfo setadinfo > setadinfo-backup.sql
```

Do not commit backups, `.env`, Rubika tokens, chat IDs, SSH keys, or private screenshots.
