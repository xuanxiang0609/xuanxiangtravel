#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

REPO_URL="${GITHUB_REPO_URL:-https://github.com/xuanxiang0609/xuanxiangtravel.git}"
BRANCH="${GITHUB_BRANCH:-codex/ultimate-final-v8}"
SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if ! command -v git >/dev/null 2>&1; then
  printf '錯誤：找不到 git，請先安裝 Git。\n' >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  printf '錯誤：找不到 GitHub CLI gh。\n' >&2
  printf '請先閱讀 GitHub上傳_新手小白操作說明.txt。\n' >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  printf '錯誤：GitHub 尚未登入。\n' >&2
  printf '請先執行：gh auth login --web\n' >&2
  printf '登入後再執行：gh auth setup-git\n' >&2
  exit 1
fi

gh auth setup-git >/dev/null

printf '1/5 下載 GitHub 儲存庫...\n'
git clone --depth=1 "$REPO_URL" "$TMP_DIR/repo"

printf '2/5 建立上傳分支 %s...\n' "$BRANCH"
if git -C "$TMP_DIR/repo" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git -C "$TMP_DIR/repo" fetch origin "$BRANCH"
  git -C "$TMP_DIR/repo" checkout -B "$BRANCH" FETCH_HEAD
else
  git -C "$TMP_DIR/repo" checkout -B "$BRANCH"
fi

printf '3/5 同步 v8 網站檔案...\n'
rsync -a --delete \
  --exclude='.git/' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  "$SOURCE_DIR/" "$TMP_DIR/repo/"

printf '4/5 建立 Git 提交...\n'
git -C "$TMP_DIR/repo" add -A
if git -C "$TMP_DIR/repo" diff --cached --quiet; then
  printf '沒有新變更，不需要再次上傳。\n'
  exit 0
fi

git -C "$TMP_DIR/repo" commit -m 'feat: publish Ultimate Final v8 shared architecture'

printf '5/5 上傳 GitHub...\n'
git -C "$TMP_DIR/repo" push -u origin "$BRANCH"

printf '\nGitHub 分支上傳完成。\n'
printf '請打開下列網址建立 PR，確認後 Merge：\n'
printf 'https://github.com/xuanxiang0609/xuanxiangtravel/compare/main...%s?expand=1\n' "$BRANCH"
