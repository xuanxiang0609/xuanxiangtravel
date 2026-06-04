#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$(cd "$ROOT/.." && pwd)"
PAGES_ZIP="$OUT_DIR/玹翔旅遊_Ultimate_Final_v8.0_Cloudflare_Pages_上傳包.zip"
PROJECT="${CLOUDFLARE_PAGES_PROJECT:-xuanxiang-vip-f44}"
BRANCH="${CLOUDFLARE_PAGES_BRANCH:-main}"
TMP_DIR="$(mktemp -d)"
export npm_config_cache="${npm_config_cache:-/tmp/xuanxiang-npm-cache}"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$ROOT"

if ! command -v npx >/dev/null 2>&1; then
  printf '錯誤：找不到 npx。請先安裝 Node.js。\n' >&2
  exit 1
fi

printf '1/4 檢查 Cloudflare Wrangler 登入...\n'
wrangler_identity="$(npx --yes wrangler@latest whoami 2>&1 || true)"
if printf '%s' "$wrangler_identity" | grep -Eqi 'not authenticated|CLOUDFLARE_API_TOKEN|ERROR'; then
  printf '錯誤：Cloudflare 尚未登入。\n' >&2
  printf '請先執行：npm_config_cache=/tmp/xuanxiang-npm-cache npx --yes wrangler@latest login\n' >&2
  printf '瀏覽器授權完成後，再重跑：bash tools/deploy_cloudflare_pages.sh\n' >&2
  exit 1
fi

printf '2/4 建立並驗證 Cloudflare Pages 專用 ZIP...\n'
bash tools/build_packages.sh

printf '3/4 解壓縮並部署 Pages 專用檔案...\n'
mkdir -p "$TMP_DIR/site"
unzip -q "$PAGES_ZIP" -d "$TMP_DIR/site"
npx --yes wrangler@latest pages deploy "$TMP_DIR/site" \
  --project-name="$PROJECT" \
  --branch="$BRANCH" \
  --commit-message="publish Ultimate Final v8 shared architecture"

printf '4/4 執行線上驗收...\n'
python3 tools/check_live_deployment.py
