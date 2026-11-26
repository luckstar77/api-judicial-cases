#!/usr/bin/env bash
# 租屋通 API：CI 部署金鑰的 forced command。
# 安裝位置：~/rental-housing/api/bin/ssh-gate.sh，authorized_keys 內以
#   command="/home/ubuntu/rental-housing/api/bin/ssh-gate.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 ...
# 限制這把金鑰只能執行 `deploy-api <40 位 commit sha>`，release 壓縮檔由 stdin 傳入；無法取得 shell。
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/ubuntu/rental-housing/api}"

read -r action sha extra <<<"${SSH_ORIGINAL_COMMAND:-}" || true
if [[ "${action:-}" != "deploy-api" || ! "${sha:-}" =~ ^[0-9a-f]{40}$ || -n "${extra:-}" ]]; then
  echo "forbidden command" >&2
  exit 2
fi

mkdir -p "$APP_ROOT/releases"
exec 9>"$APP_ROOT/deploy.lock"
if ! flock -n 9; then
  echo "another deploy is running" >&2
  exit 3
fi

release="$APP_ROOT/releases/$sha"
staging="$release.incoming"

# 重跑同一個 commit 的部署：線上版本不能被覆寫（會刪掉執行中的檔案），直接視為完成
if [[ -L "$APP_ROOT/current" && "$(readlink -f "$APP_ROOT/current")" == "$release" ]]; then
  cat >/dev/null
  echo "$sha is already live; nothing to deploy"
  exit 0
fi

rm -rf "$staging"
mkdir -p "$staging"
tar -xzf - -C "$staging" --no-same-owner --no-same-permissions
rm -rf "$release"
mv "$staging" "$release"

# fd 9 在 exec 之後仍然開著，部署期間持續持有鎖
exec bash "$release/deploy/remote-deploy.sh" "$sha"
