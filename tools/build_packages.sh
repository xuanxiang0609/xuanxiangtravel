#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$(cd "$ROOT/.." && pwd)"
SOURCE_ZIP="$OUT_DIR/玹翔旅遊_Ultimate_Final_v8.0_長期營運版_可上線下載包.zip"
PAGES_ZIP="$OUT_DIR/玹翔旅遊_Ultimate_Final_v8.0_Cloudflare_Pages_上傳包.zip"

cd "$ROOT"
rm -rf tools/__pycache__
rm -f "$SOURCE_ZIP" "$PAGES_ZIP"

printf '1/5 執行本機發布前驗證...\n'
python3 tools/validate_site.py

printf '2/5 建立完整原始碼 ZIP...\n'
zip -r -q "$SOURCE_ZIP" . \
  -x '*.DS_Store' '*/__pycache__/*' '*.pyc' '*.log'

printf '3/5 建立 Cloudflare Pages 專用 ZIP...\n'
zip -r -q "$PAGES_ZIP" . \
  -x '*.DS_Store' '*/__pycache__/*' '*.pyc' '*.log' \
     'apps-script/*' 'tools/*' \
     'docs/*' \
     'firebase.json' 'firestore.rules' 'firestore.indexes.json' \
     '*.txt' 'README.md' 'README.html' 'content-merged.html'

printf '4/5 驗證 ZIP 完整性...\n'
unzip -t "$SOURCE_ZIP" >/dev/null
unzip -t "$PAGES_ZIP" >/dev/null

printf '5/5 檢查 Cloudflare 上傳包不可包含內部檔案...\n'
if unzip -Z1 "$PAGES_ZIP" | grep -Eq '^(apps-script/|tools/|docs/|firebase\.json$|firestore\.|.*\.txt$|.*\.log$|README\.md$|README\.html$|content-merged\.html$)'; then
  printf '錯誤：Cloudflare Pages 上傳包仍含內部檔案。\n' >&2
  exit 1
fi

printf '\n封裝完成：\n'
ls -lh "$SOURCE_ZIP" "$PAGES_ZIP"
printf '\nSHA-256：\n'
shasum -a 256 "$SOURCE_ZIP" "$PAGES_ZIP"
