#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export COMPOSE_PARALLEL_LIMIT=1
BASE=/opt/vcars-preview
INCOMING=${1:?Incoming directory required}
RELEASE_ID=${2:?Release identifier required}
[[ "$RELEASE_ID" =~ ^[a-z0-9-]+$ ]] || exit 2
[[ "$INCOMING" == "$BASE/incoming/"* ]] || exit 2
mkdir -p "$BASE/releases" "$BASE/data/uploads" "$BASE/backups"
exec 9>"$BASE/deploy.lock"
flock -w 30 9
RELEASE_DIR="$BASE/releases/$RELEASE_ID"
test ! -e "$RELEASE_DIR" || { echo 'Release already exists; publish a new immutable release.'; exit 1; }
mkdir "$RELEASE_DIR"
tar -xzf "$INCOMING/release.tar.gz" -C "$RELEASE_DIR"
test -f "$RELEASE_DIR/deploy/compose.yml"
test -f "$RELEASE_DIR/web/package-lock.json"
test -f "$RELEASE_DIR/api/prisma/schema.prisma"
if [ ! -f "$BASE/runtime.env" ]; then
  test -f "$RELEASE_DIR/bootstrap/database.dump"
  test -f "$RELEASE_DIR/bootstrap/review-key"
  {
    printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)"
    printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 48)"
    printf 'PUBLIC_ORIGIN=https://www.viralcoproducciones.com\n'
  } > "$BASE/runtime.env"
  install -m 600 "$RELEASE_DIR/bootstrap/review-key" "$BASE/review-key"
fi
compose() {
  RELEASE_DIR="$RELEASE_DIR" RELEASE_ID="$RELEASE_ID" docker compose -p vcars_preview --env-file "$BASE/runtime.env" -f "$RELEASE_DIR/deploy/compose.yml" "$@"
}
PREVIOUS=$(readlink -f "$BASE/current" || true)
BACKUP="$BASE/backups/$RELEASE_ID"
mkdir -p "$BACKUP"
curl -fsSL --retry 2 --max-time 30 https://www.viralcoproducciones.com/ > "$BACKUP/viralco-before.html"
if [ -f "$BASE/database-initialized" ]; then
  compose exec -T db pg_dump -U vcars -d vcars -Fc --no-owner --no-acl > "$BACKUP/database.dump"
  tar -czf "$BACKUP/uploads.tar.gz" -C "$BASE/data" uploads
fi
echo 'Building isolated VCARS images; existing sites remain running.'
compose build api web
compose up -d --wait --wait-timeout 120 db
if [ ! -f "$BASE/database-initialized" ]; then
  TABLES=$(compose exec -T db psql -U vcars -d vcars -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
  [ "$TABLES" = 0 ] || { echo 'Non-empty uninitialized preview database; refusing to overwrite.'; exit 1; }
  compose exec -T db pg_restore -U vcars -d vcars --no-owner --no-acl --single-transaction --exit-on-error < "$RELEASE_DIR/bootstrap/database.dump"
  touch "$BASE/database-initialized"
fi
if [ ! -f "$BASE/uploads-initialized" ]; then
  cp -a "$RELEASE_DIR/bootstrap/uploads/." "$BASE/data/uploads/"
  touch "$BASE/uploads-initialized"
fi
rollback() {
  if [ -n "$PREVIOUS" ] && [ -f "$PREVIOUS/deploy/compose.yml" ]; then
    echo 'Restoring previous VCARS containers. Database backup retained; no destructive data rollback.'
    RELEASE_DIR="$PREVIOUS" RELEASE_ID="$(basename "$PREVIOUS")" docker compose -p vcars_preview --env-file "$BASE/runtime.env" -f "$PREVIOUS/deploy/compose.yml" up -d --no-build || true
  fi
}
if ! compose up -d --wait --wait-timeout 240 api web gateway; then
  compose logs --tail 40 api web
  rollback
  exit 1
fi
curl -fsS --retry 3 --max-time 20 http://127.0.0.1:3013/vcars/api/backend/health/ > "$BACKUP/health.json"
python3 "$RELEASE_DIR/deploy/nginx.py" "$BACKUP/nginx"
curl -fsSL --retry 2 --max-time 30 https://www.viralcoproducciones.com/ > "$BACKUP/viralco-after.html"
if ! cmp -s "$BACKUP/viralco-before.html" "$BACKUP/viralco-after.html"; then
  echo 'Viralco home changed during deployment; restoring original routing for inspection.'
  if [ -f "$BACKUP/nginx/viralco-nginx.conf" ]; then
    cp -p "$BACKUP/nginx/viralco-nginx.conf" "$(readlink -f /etc/nginx/sites-enabled/viralcoproducciones.conf)"
    nginx -t && systemctl reload nginx
  fi
  rollback
  exit 1
fi
ln -s "$RELEASE_DIR" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"
printf '%s\n' "$RELEASE_ID" > "$BASE/current-release"
# Bootstrap data is used once; future versions always retain the server database.
rm -f "$RELEASE_DIR/bootstrap/database.dump" "$RELEASE_DIR/bootstrap/review-key" "$INCOMING/release.tar.gz"
echo 'VCARS healthy. Viralco homepage identical. Persistent database and photos preserved.'
compose ps
