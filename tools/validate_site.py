#!/usr/bin/env python3
"""玹翔旅遊 v8.0 靜態驗證器。"""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote

from site_manifest import BLOCKED_ROUTES, FIREBASE_DATABASE_ID, INDEXABLE, NOINDEX, SITE_URL

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
pages = sorted(ROOT.glob("*.html"))
expected_scripts = ["assets/js/config.js", "assets/js/site-layout.js", "assets/js/site.js", "assets/js/pricing-freeze.js"]
dynamic_anchors = {"contact"}
trip_booking_pages = {"hehuanshan-day.html", "smangus-day.html", "qingjing-sunmoonlake-day.html", "travel-smangus.html"}
legacy_injected_markers = [
    "全站統一三欄式聯繫方式 Ultimate Final v7.0",
    "v7.1 統一導覽列",
    "全站統一黑金高端導覽列 FINAL",
    'id="xx-mobile-dropdown-final"',
    'id="xx-mobile-dropdown-script"',
    'id="xx-click-dropdown-script"',
    'id="xx-mobile-nav-final"',
    'id="xx-nav-label-sync"',
    'id="xx-table-fix-final"',
    'data-xx-upgraded="v7"',
]
public_contact_literals = [
    "0972-268295",
    "0972268295",
    "@sco20240609",
    "xuanxiang0609@gmail.com",
    "https://line.me/R/ti/p/@sco20240609",
]


def fail(message: str) -> None:
    errors.append(message)


if len(pages) != 59:
    fail(f"根目錄 HTML 應為 59 個，實際為 {len(pages)} 個")

for page in pages:
    html = page.read_text(encoding="utf-8", errors="replace")
    if "\ufffd" in html:
        fail(f"{page.name}: 內文含替代字元")
    if re.search(r'<header\b[^>]*\bxx-topbar\b', html, re.I):
        fail(f"{page.name}: 仍保留重複 Header")
    if re.search(r'<footer\b[^>]*\bxx-footer-clean\b', html, re.I):
        fail(f"{page.name}: 仍保留重複 Footer")
    for mount in ["xx-site-header", "xx-site-footer", "xx-site-floating"]:
        if len(re.findall(rf'id=["\']{mount}["\']', html, re.I)) != 1:
            fail(f"{page.name}: {mount} 掛載點不是 1 個")
    for script in expected_scripts:
        if len(re.findall(rf'<script\b[^>]*\bsrc=["\']{re.escape(script)}["\']', html, re.I)) != 1:
            fail(f"{page.name}: {script} 載入次數不是 1")
    for pattern, label in [
        (r'<link\b[^>]*\bhref=["\']https://fonts\.googleapis\.com/css2', "Google Fonts stylesheet"),
        (r'<link\b(?=[^>]*\brel=["\']preconnect["\'])(?=[^>]*\bhref=["\']https://fonts\.googleapis\.com["\'])', "Google Fonts preconnect"),
        (r'<link\b(?=[^>]*\brel=["\']preconnect["\'])(?=[^>]*\bhref=["\']https://fonts\.gstatic\.com["\'])', "Google Fonts static preconnect"),
    ]:
        if len(re.findall(pattern, html, re.I)) > 1:
            fail(f"{page.name}: 重複載入 {label}")
    if "https://www.xuanxiangtravel.com" in html or "https://xuanxiang-travel.pages.dev" in html:
        fail(f"{page.name}: 仍使用失效網域")
    if "https://lin.ee/oQQR3Ej" in html:
        fail(f"{page.name}: 仍使用失效 LINE 連結")
    for marker in legacy_injected_markers:
        if marker in html:
            fail(f"{page.name}: 還有 v7 注入殘留：{marker}")
    for literal in public_contact_literals:
        if literal in html:
            fail(f"{page.name}: 還有逐頁聯絡資訊，應改由 config.js 注入：{literal}")
    if re.search(r"const APPS_SCRIPT_URL\s*=\s*['\"]https://script\.google\.com/", html):
        fail(f"{page.name}: 還有獨立 Apps Script 網址，應改讀取 config.js")
    if "const APPS_SCRIPT_URL" in html:
        fail(f"{page.name}: 還有不必要的逐頁 Apps Script 變數")
    if "docs.google.com/spreadsheets/d/" in html or re.search(r"\bconst\s+(?:SHEET_ID|SPREADSHEET_ID)\b", html):
        fail(f"{page.name}: 還有 Google Sheet 直連，應統一經 Apps Script API")
    if "請到程式碼 firebaseConfig 填入你的專案資料" in html:
        fail(f"{page.name}: 還有舊 Firebase 逐頁設定提示")
    if "window.saveToFirebase" in html:
        fail(f"{page.name}: 還有舊 Firebase 活動頁送單範例")
    if not re.search(r'<link\b[^>]*rel=["\']canonical["\'][^>]*href=["\']https://xuanxiangtravel\.com', html, re.I):
        fail(f"{page.name}: canonical 未統一")
    if not re.search(r'<meta\b[^>]*name=["\']viewport["\']', html, re.I):
        fail(f"{page.name}: 缺少 viewport")
    if page.name in NOINDEX and not re.search(r'<meta\b[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', html, re.I):
        fail(f"{page.name}: 內部、完成或轉址頁缺少 noindex")
    if "aggregateRating" in html:
        fail(f"{page.name}: 不可放入未經驗證的評分結構化資料")

    ids = set(re.findall(r'\bid=["\']([^"\']+)', html, re.I)) | dynamic_anchors
    raw_ids = re.findall(r'\bid=["\']([^"\']+)', html, re.I)
    if len(raw_ids) != len(set(raw_ids)):
        fail(f"{page.name}: 含有重複 id")
    for href in re.findall(r'href=["\']([^"\']+)', html, re.I):
        if href != "#" and href.startswith("#") and href[1:] not in ids:
            fail(f"{page.name}: 找不到錨點 {href}")
        if href != "#" and "#" in href and href.split("#", 1)[0] in {"", page.name} and href.split("#", 1)[1] not in ids:
            fail(f"{page.name}: 找不到錨點 #{href.split('#', 1)[1]}")
    if page.name in trip_booking_pages:
        if len(re.findall(r"assets/js/trip-booking\.js", html)) != 1:
            fail(f"{page.name}: 旅遊活動共用送單模組載入次數不是 1")
        if "window.XUANXIANG_TRIP_BOOKING.submit" not in html:
            fail(f"{page.name}: 未使用旅遊活動共用送單模組")
        if "2026-06-01" in html or "2026年6月1日" in html:
            fail(f"{page.name}: 還有過期的活動預設日期")
    if page.name == "booking.html":
        if "<option>機場接送</option>" in html:
            fail("booking.html: 還有靜態服務項目，應由 config.js 的 SERVICES 注入")
        if 'data-require-member="true"' in html:
            fail("booking.html: 還有與訪客預約設定衝突的會員必填標記")

for alias in ["member.html", "member-login.html"]:
    if (ROOT / alias).stat().st_size > 3000:
        fail(f"{alias}: 舊會員頁內容過大，應保留輕量轉址")

missing: dict[str, set[str]] = {}
for page in sorted(ROOT.rglob("*.html")):
    html = page.read_text(encoding="utf-8", errors="replace")
    base = ROOT if '<base href="../">' in html else page.parent
    for raw in re.findall(r'(?:src|href|poster)=["\']([^"\'#?]+)', html, re.I):
        if not raw or re.match(r'^(?:https?:|mailto:|tel:|weixin:|javascript:|data:|//)', raw, re.I):
            continue
        target = base / unquote(raw)
        if not target.exists():
            missing.setdefault(raw, set()).add(page.name)
for target, owners in sorted(missing.items()):
    fail(f"缺少本機檔案：{target} <- {', '.join(sorted(owners))}")

for page in sorted(ROOT.rglob("*.html")):
    html = page.read_text(encoding="utf-8", errors="replace")
    base = ROOT if '<base href="../">' in html else page.parent
    for raw in re.findall(r'href=["\']([^"\']+#[^"\']*)', html, re.I):
        route, anchor = raw.split("#", 1)
        if not anchor or re.match(r'^(?:https?:|mailto:|tel:|weixin:|javascript:|data:|//)', route, re.I):
            continue
        target = (base / unquote(route)) if route else page
        if target.suffix.lower() != ".html" or not target.exists():
            continue
        target_html = target.read_text(encoding="utf-8", errors="replace")
        if anchor not in dynamic_anchors and not re.search(rf'\bid=["\']{re.escape(anchor)}["\']', target_html, re.I):
            fail(f"{page.name}: 跨頁錨點不存在：{raw}")

for path in ROOT.rglob("*"):
    if any(marker in path.name for marker in ("╧", "Γ", "┬", "µ", "σ", "Φ", "�", "∩╝")):
        fail(f"仍有疑似亂碼檔名：{path.relative_to(ROOT)}")
    if "本機私密設定" in path.name:
        fail(f"本機私密設定不可放進網站工作區：{path.relative_to(ROOT)}")
    if path.is_file() and path.suffix.lower() == ".log":
        fail(f"除錯紀錄不可放進網站工作區：{path.relative_to(ROOT)}")

for required in [
    "README_新手小白操作說明.txt",
    "API串接正式版_新手一步一步教學.txt",
    "apps-script/Code.gs",
    "tools/build_packages.sh",
    "tools/check_live_deployment.py",
    "tools/deploy_cloudflare_pages.sh",
    "tools/deploy_firebase_rules.sh",
]:
    if not (ROOT / required).exists():
        fail(f"缺少交付文件：{required}")

code_gs = (ROOT / "apps-script/Code.gs").read_text(encoding="utf-8")
for key in ["ORDER_SHEET_ID", "PRICE_SHEET_ID", "LINE_ADMIN_IDS", "LINE_CHANNEL_ACCESS_TOKEN"]:
    if f"requiredProperty_('{key}')" not in code_gs and f"property_('{key}')" not in code_gs and f"csvProperty_('{key}')" not in code_gs:
        fail(f"apps-script/Code.gs: 缺少指令碼屬性讀取：{key}")
if re.search(r"\b(?:ORDER_SHEET_ID|PRICE_SHEET_ID)\s*:\s*['\"][^'\"]+['\"]", code_gs):
    fail("apps-script/Code.gs: 不可硬編碼 Google Sheet ID")
if re.search(r"\bLINE_ADMIN_IDS\s*:\s*\[", code_gs):
    fail("apps-script/Code.gs: 不可硬編碼 LINE 管理員 ID")

config_js = (ROOT / "assets/js/config.js").read_text(encoding="utf-8")
for key in ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"]:
    if not re.search(rf"\b{key}\s*:\s*['\"][^'\"]+['\"]", config_js):
        fail(f"assets/js/config.js: Firebase 公開設定缺少 {key}")
if f'FIREBASE_DATABASE_ID: "{FIREBASE_DATABASE_ID}"' not in config_js:
    fail(f"assets/js/config.js: FIREBASE_DATABASE_ID 必須是 {FIREBASE_DATABASE_ID}")
layout_js = (ROOT / "assets/js/site-layout.js").read_text(encoding="utf-8")
if "firebase-analytics.js" not in layout_js or "getAnalytics(app)" not in layout_js:
    fail("assets/js/site-layout.js: Firebase Analytics 尚未啟用")
member_js = (ROOT / "assets/js/member.js").read_text(encoding="utf-8")
if 'getFirestore(app, cfg.FIREBASE_DATABASE_ID || "xuanxiangtravel")' not in member_js:
    fail("assets/js/member.js: 會員系統未指定命名 Firestore 資料庫")

firebase_json = json.loads((ROOT / "firebase.json").read_text(encoding="utf-8"))
firestore_targets = firebase_json.get("firestore", [])
if not isinstance(firestore_targets, list) or not any(target.get("database") == FIREBASE_DATABASE_ID for target in firestore_targets):
    fail(f"firebase.json: Firestore 發布目標必須包含命名資料庫 {FIREBASE_DATABASE_ID}")

headers = (ROOT / "_headers").read_text(encoding="utf-8")
if "/assets/js/config.js" not in headers or "no-cache, no-store, must-revalidate" not in headers:
    fail("_headers: config.js 必須停用快取，確保全站設定立即同步")

redirects = (ROOT / "_redirects").read_text(encoding="utf-8")
for blocked in BLOCKED_ROUTES:
    if blocked not in redirects:
        fail(f"_redirects: 缺少內部檔案阻擋規則：{blocked}")

try:
    sitemap = ET.parse(ROOT / "sitemap.xml")
    locations = [node.text or "" for node in sitemap.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    expected_locations = [SITE_URL + ("/" if page == "index.html" else f"/{page}") for page in INDEXABLE]
    if locations != expected_locations:
        fail("sitemap.xml 頁面清單未與公開發布清單同步")
    if not locations or any(not location.startswith(f"{SITE_URL}/") for location in locations):
        fail("sitemap.xml 網域未統一")
except Exception as error:
    fail(f"sitemap.xml 無法解析：{error}")

robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
if f"Sitemap: {SITE_URL}/sitemap.xml" not in robots:
    fail("robots.txt Sitemap 網址錯誤")

if errors:
    print("驗證失敗：")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"驗證通過：{len(pages)} 個 HTML 已掛 v8 共用架構，未發現本機缺檔。")
