#!/usr/bin/env python3
"""玹翔旅遊 v8.0：部署完成後的一鍵線上驗收。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urljoin
from urllib.request import Request, urlopen

from site_manifest import FIREBASE_DATABASE_ID, SITE_URL

ROOT = Path(__file__).resolve().parents[1]
PAGES_URL = "https://xuanxiang-vip-f44.pages.dev"
LINE_URL = "https://line.me/R/ti/p/@sco20240609"
BLOCKED = [
    "apps-script/Code.gs",
    "tools/validate_site.py",
    "firebase.json",
    "README.html",
    "content-merged.html",
    "docs/API正式串接_一步一步圖文教學.html",
]
errors: list[str] = []


def request(url: str, *, data: dict[str, object] | None = None) -> tuple[int, str]:
    body = None if data is None else json.dumps(data).encode("utf-8")
    headers = {"User-Agent": "XuanXiang-v8-live-check/1.0"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    for _ in range(6):
        encoded_url = quote(url, safe=":/?&=%@#+")
        try:
            with urlopen(Request(encoded_url, data=body, headers=headers), timeout=20) as response:
                return response.status, response.read().decode("utf-8", errors="replace")
        except HTTPError as error:
            if error.code == 308 and error.headers.get("Location"):
                url = urljoin(url, error.headers["Location"])
                continue
            return error.code, error.read().decode("utf-8", errors="replace")
        except URLError as error:
            return 0, str(error)
    return 0, "重新導向次數過多"


def get_json(url: str, *, data: dict[str, object] | None = None) -> tuple[int, dict[str, object]]:
    code, body = request(url, data=data)
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        parsed = {"raw": body[:300]}
    return code, parsed


def check(ok: bool, success: str, failure: str) -> None:
    if ok:
        print(f"通過：{success}")
    else:
        errors.append(failure)
        print(f"未通過：{failure}")


def config_value(config_js: str, key: str) -> str:
    match = re.search(rf"\b{re.escape(key)}\s*:\s*['\"]([^'\"]+)['\"]", config_js)
    return match.group(1) if match else ""


config_js = (ROOT / "assets/js/config.js").read_text(encoding="utf-8")
api_url = config_value(config_js, "APPS_SCRIPT_URL")
firebase = {key: config_value(config_js, key) for key in [
    "apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"
]}

print("一、Apps Script")
code, health = get_json(f"{api_url}?action=health")
properties = health.get("properties", {}) if isinstance(health, dict) else {}
check(code == 200 and health.get("version") == "ultimate-final-v8", "Apps Script 已部署 ultimate-final-v8", "Apps Script 仍不是 ultimate-final-v8，請重新部署 Code.gs 新版本")
check(isinstance(properties, dict) and all(properties.get(key) is True for key in ["orderSheet", "priceSheet", "lineToken", "lineRecipients"]), "Apps Script 四個必要屬性皆已設定", "Apps Script properties 尚未全部為 true")
for sheet in ["桃園機場", "平安港", "百岳報價", "長途接送-五人座"]:
    code, payload = get_json(f"{api_url}?action=prices&sheet={quote(sheet)}")
    check(code == 200 and payload.get("ok") is True and bool(payload.get("rows")), f"價目表 API 可讀取：{sheet}", f"價目表 API 無法讀取：{sheet}")

print("\n二、Firebase")
code, remote_firebase = get_json(f"https://{firebase['authDomain']}/__/firebase/init.json")
check(code == 200 and all(remote_firebase.get(key) == value for key, value in firebase.items()), "Firebase 公開 Web 設定一致", "Firebase 公開 Web 設定與 config.js 不一致")
code, project = get_json(f"https://identitytoolkit.googleapis.com/v1/projects?{urlencode({'key': firebase['apiKey']})}")
domains = project.get("authorizedDomains", []) if isinstance(project, dict) else []
check(code == 200 and all(domain in domains for domain in ["xuanxiangtravel.com", "xuanxiang-vip-f44.pages.dev"]), "Firebase Authorized domains 已包含正式與 Pages 網域", "Firebase Authorized domains 缺少正式網域或 Pages 網域")
code, google = get_json(
    f"https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?{urlencode({'key': firebase['apiKey']})}",
    data={"providerId": "google.com", "continueUri": f"{SITE_URL}/login.html"},
)
check(code == 200 and google.get("providerId") == "google.com" and bool(google.get("authUri")), "Firebase Google 登入已啟用", "Firebase Google 登入尚未啟用")
code, email = get_json(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?{urlencode({'key': firebase['apiKey']})}",
    data={"email": "codex-probe-do-not-create@example.invalid", "password": "not-a-real-password", "returnSecureToken": True},
)
email_error = email.get("error", {}) if isinstance(email, dict) else {}
check(code == 400 and isinstance(email_error, dict) and email_error.get("message") == "INVALID_LOGIN_CREDENTIALS", "Firebase Email/Password 登入已啟用", "Firebase Email/Password 登入尚未啟用")
firestore_url = f"https://firestore.googleapis.com/v1/projects/{firebase['projectId']}/databases/{FIREBASE_DATABASE_ID}/documents/members/codex-public-probe"
code, firestore = get_json(firestore_url)
firestore_error = firestore.get("error", {}) if isinstance(firestore, dict) else {}
check(code == 403 and isinstance(firestore_error, dict) and firestore_error.get("status") == "PERMISSION_DENIED", f"命名 Firestore 資料庫 {FIREBASE_DATABASE_ID} 存在且未登入不可讀取", f"命名 Firestore 資料庫 {FIREBASE_DATABASE_ID} 不存在或規則異常")

print("\n三、網站部署")
for base, label in [(SITE_URL, "正式網域"), (PAGES_URL, "Pages 網域")]:
    code, body = request(f"{base}/assets/js/config.js")
    check(code == 200 and "Ultimate Final v8.0" in body and "XXPricing" in body, f"{label} 已部署 v8 config.js", f"{label} 尚未部署 v8 config.js")
    for page in ["", "booking.html", "price.html", "login.html", "robots.txt", "sitemap.xml"]:
        code, _ = request(f"{base}/{page}")
        check(code == 200, f"{label} 可讀取 /{page}", f"{label} 無法讀取 /{page}，HTTP {code}")
    for route in BLOCKED:
        code, _ = request(f"{base}/{route}")
        check(code == 404, f"{label} 已封鎖 /{route}", f"{label} 尚未封鎖 /{route}，HTTP {code}")
code, _ = request(LINE_URL)
check(code == 200, "LINE 官方客服連結可開啟", f"LINE 官方客服連結異常，HTTP {code}")

print("\n四、驗收結果")
if errors:
    print(f"尚有 {len(errors)} 項未完成：")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)
print("線上驗收全部通過，可以進行正式營運。")
