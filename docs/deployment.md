# Deployment

SetadInfo can run on one small VPS with Docker Compose, PostgreSQL, Redis,
FastAPI workers, and the routed workbench served by Nginx.

## Target Shape

- Public domain: your own hostname, for example `setadinfo.example.com`
- Application directory: `/opt/setadinfo`
- Compose web binding: `127.0.0.1:18731:80`
- Host Nginx terminates TLS and proxies traffic to `127.0.0.1:18731`

## DNS

Create an `A` or `AAAA` record for your chosen hostname and point it to the
server that runs Docker Compose. Keep DNS-only mode while issuing TLS
certificates unless your DNS provider requires a different flow.

## Required Environment

Create `/opt/setadinfo/.env` from `.env.example` and set strong production
values:

- `APP_BASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- Optional `RUBIKA_BOT_TOKEN`
- Optional `RUBIKA_DEFAULT_CHAT_ID`

Never commit production values, bot tokens, chat IDs, database dumps, SSH keys,
or certificate private keys.

## TLS And Nginx

`deploy/nginx-setadinfo.conf` is a public-safe example. Replace
`setadinfo.example.com` with your hostname and update the certificate paths for
your certificate manager.

Typical host-level proxy flow:

```nginx
location / {
  proxy_pass http://127.0.0.1:18731;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Backup

Before schema changes or deployments:

```bash
mkdir -p /opt/setadinfo/backups
docker compose exec -T db pg_dump -U setadinfo -d setadinfo -Fc \
  > "/opt/setadinfo/backups/setadinfo-$(date +%Y%m%d-%H%M%S).dump"
```

Retain backups outside the container volume and test restoration periodically.

## Deploy

From `/opt/setadinfo/current`:

```bash
docker compose config --quiet
docker compose up -d --build --remove-orphans
docker compose ps
curl -fsS http://127.0.0.1:18731/api/health
```

The database and Redis volumes are persistent. Do not delete them during a
normal deployment.
