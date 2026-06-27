#!/bin/sh
set -eu

app_root="${1:-/opt/setadinfo}"
cd "$app_root/current"

new_password="$(openssl rand -hex 24)"
printf "ALTER ROLE setadinfo PASSWORD '%s';\n" "$new_password" \
  | docker compose exec -T db psql -U setadinfo -d setadinfo >/dev/null

docker compose exec -T -e PGPASSWORD="$new_password" db \
  psql -h 127.0.0.1 -U setadinfo -d setadinfo -c "SELECT 1;" >/dev/null

if grep -q "^POSTGRES_PASSWORD=" "$app_root/.env"; then
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$new_password/" "$app_root/.env"
else
  printf "\nPOSTGRES_PASSWORD=%s\n" "$new_password" >> "$app_root/.env"
fi

chmod 600 "$app_root/.env"
printf "password_rotated=yes verified=yes\n"
