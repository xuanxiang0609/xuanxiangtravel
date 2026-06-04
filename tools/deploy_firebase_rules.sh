#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  rm -f firebase-debug.log
}
trap cleanup EXIT
cleanup

if ! command -v firebase >/dev/null 2>&1; then
  printf '錯誤：找不到 Firebase CLI。請先安裝：npm install -g firebase-tools\n' >&2
  exit 1
fi

if ! firebase login:list >/dev/null 2>&1; then
  printf '錯誤：Firebase 尚未登入。請先執行：firebase login\n' >&2
  exit 1
fi

printf '發布 Firestore Rules 到命名資料庫 xuanxiangtravel...\n'
firebase deploy --only firestore:xuanxiangtravel --project xuanxiang-travel
printf '\nFirestore Rules 發布完成。\n'
