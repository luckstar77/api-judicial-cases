#!/usr/bin/env bash
# 在主機上執行（由 ssh-gate.sh 呼叫）：
#   安裝依賴 → 有待執行 migration 時先備份 DB 再 migrate → 切換 current → 重啟 pm2 → 健康檢查，失敗自動回滾
set -euo pipefail

SHA="$1"
APP_ROOT="${APP_ROOT:-/home/ubuntu/rental-housing/api}"
RELEASE="$APP_ROOT/releases/$SHA"
CURRENT="$APP_ROOT/current"
SHARED_ENV="$APP_ROOT/shared/.env"
BACKUP_DIR="$APP_ROOT/backups"
PM2_APP="rental"
ECOSYSTEM="$HOME/ecosystem.config.js"
HEALTH_URL="http://127.0.0.1:3010/v1/health"
HEALTH_RETRIES=30
KEEP_RELEASES=5
KEEP_BACKUPS=5

log() { echo "[deploy $(date -u +%H:%M:%S)] $*"; }
fail() { log "ERROR: $*"; exit 1; }

NODE_BIN="$(ls -d "$HOME"/.nvm/versions/node/v22.*/bin 2>/dev/null | sort -V | tail -n1)"
[[ -n "$NODE_BIN" ]] || fail "Node.js 22 not installed (nvm install 22)"
PM2="${PM2:-$(ls "$HOME"/.nvm/versions/node/*/bin/pm2 2>/dev/null | head -n1)}"
[[ -x "$PM2" ]] || fail "pm2 not found"
export PATH="$NODE_BIN:$PATH"
[[ -f "$SHARED_ENV" ]] || fail "missing $SHARED_ENV"

env_value() {
  local value
  value="$(grep -E "^$1=" "$SHARED_ENV" | tail -n1 | cut -d= -f2- || true)"
  echo "${value:-$2}"
}

cd "$RELEASE"
ln -sfn "$SHARED_ENV" .env

log "node $(node -v), installing production dependencies"
npm ci --omit=dev --no-audit --no-fund --loglevel=error

TYPEORM=(node node_modules/typeorm/cli.js)
DATA_SOURCE="dist/database/data-source.js"
pending="$("${TYPEORM[@]}" migration:show -d "$DATA_SOURCE" | grep -c '\[ \]' || true)"
if [[ "$pending" -gt 0 ]]; then
  mkdir -p "$BACKUP_DIR"
  backup="$BACKUP_DIR/$(env_value DB_NAME rental)-$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:7}.sql.gz"
  log "$pending pending migration(s); backing up database to $backup"
  MYSQL_PWD="$(env_value DB_PASSWORD '')" mysqldump \
    -h "$(env_value DB_HOST 127.0.0.1)" -P "$(env_value DB_PORT 3306)" -u "$(env_value DB_USER root)" \
    --single-transaction --routines --triggers --set-gtid-purged=OFF "$(env_value DB_NAME rental)" | gzip >"$backup"
  gzip -t "$backup" || fail "database backup is corrupted"
  ls -1t "$BACKUP_DIR"/*.sql.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
  log "running migrations"
  "${TYPEORM[@]}" migration:run -d "$DATA_SOURCE"
else
  log "no pending migrations"
fi

PREVIOUS="$(readlink -f "$CURRENT" 2>/dev/null || true)"

switch_to() {
  ln -sfn "$1" "$CURRENT.next"
  mv -Tf "$CURRENT.next" "$CURRENT"
}

restart_app() {
  local pm2_cwd
  pm2_cwd="$("$PM2" jlist 2>/dev/null | node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk)).on("end", () => {
      const app = JSON.parse(raw || "[]").find((item) => item.name === process.argv[1]);
      console.log(app ? app.pm2_env.pm_cwd : "");
    });' "$PM2_APP")"
  if [[ "$pm2_cwd" == "$CURRENT" ]]; then
    "$PM2" restart "$PM2_APP" >/dev/null
  else
    # 第一次切換或 ecosystem 有變更：依 ~/ecosystem.config.js 重新建立
    "$PM2" delete "$PM2_APP" >/dev/null 2>&1 || true
    "$PM2" start "$ECOSYSTEM" --only "$PM2_APP" >/dev/null
  fi
  "$PM2" save >/dev/null
}

healthy() {
  local _
  for _ in $(seq 1 "$HEALTH_RETRIES"); do
    if curl -fsS --max-time 2 "$HEALTH_URL" 2>/dev/null | grep -q '"db":"up"'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

log "switching current -> $RELEASE"
switch_to "$RELEASE"
restart_app

if ! healthy; then
  log "health check failed; recent logs:"
  "$PM2" logs "$PM2_APP" --nostream --lines 40 2>&1 | tail -n 40 || true
  if [[ -n "$PREVIOUS" && "$PREVIOUS" != "$RELEASE" && -d "$PREVIOUS" ]]; then
    log "rolling back to $PREVIOUS"
    switch_to "$PREVIOUS"
    restart_app
    if healthy; then
      log "rollback healthy"
    else
      log "rollback ALSO unhealthy, manual action required"
    fi
  fi
  fail "deploy of $SHA failed"
fi

log "healthy; cleaning old releases"
keep_current="$(readlink -f "$CURRENT")"
ls -1dt "$APP_ROOT"/releases/*/ 2>/dev/null | sed 's:/$::' | while read -r dir; do
  [[ "$dir" == "$keep_current" || "$dir" == "$PREVIOUS" ]] && continue
  echo "$dir"
done | tail -n +$((KEEP_RELEASES - 1)) | xargs -r rm -rf

log "deployed $SHA"
