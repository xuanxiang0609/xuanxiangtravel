#!/usr/bin/env python3
"""玹翔旅遊 v8.0：將根目錄 HTML 機械式升級成共用殼層。"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from site_manifest import INDEXABLE, NOINDEX, SITE_URL

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DESCRIPTION = "玹翔旅遊提供機場接送、港口接送、旅遊包車、登山包車、商務專車與高端包車服務。"

REMOVE_SCRIPT = re.compile(
    r'<script\b[^>]*\bsrc=["\']assets/js/(?:config|site(?:-layout)?|member|xx-[^"\']+|pricing-freeze)\.js["\'][^>]*>\s*</script>',
    re.I,
)
REMOVE_STYLE = re.compile(
    r'<link\b[^>]*\bhref=["\']assets/css/xx-[^"\']+\.css["\'][^>]*>\s*',
    re.I,
)
HEADER = re.compile(r'<header\b[^>]*class=["\'][^"\']*\bxx-topbar\b[^"\']*["\'][^>]*>.*?</header>\s*', re.I | re.S)
FOOTER = re.compile(r'<footer\b[^>]*class=["\'][^"\']*\bxx-footer-clean\b[^"\']*["\'][^>]*>.*?</footer>\s*', re.I | re.S)
FLOAT = re.compile(r'<div\b[^>]*class=["\'][^"\']*\bxx-float\b[^"\']*["\'][^>]*>.*?</div>\s*', re.I | re.S)
MEMBER_HELPER = re.compile(r'<section\b[^>]*class=["\'][^"\']*\bxx-member-helper\b[^"\']*["\'][^>]*>.*?</section>\s*', re.I | re.S)
LEGACY_BLACK_GOLD_NAV = re.compile(r'/\* ===== 玹翔旅遊｜全站統一黑金高端導覽列 FINAL ===== \*/.*?(?=</style>)', re.I | re.S)
LEGACY_CLICK_NAV_STYLE = re.compile(r'<style>\s*/\* ===== 點擊式下拉選單｜桌機與手機統一 ===== \*/.*?</style>\s*', re.I | re.S)
LEGACY_INJECTED_STYLE = re.compile(r'<style\b[^>]*\bid=["\']xx-mobile-dropdown-final["\'][^>]*>.*?</style>\s*', re.I | re.S)
LEGACY_INJECTED_SCRIPT = re.compile(
    r'<script\b[^>]*\bid=["\'](?:xx-mobile-dropdown-script|xx-click-dropdown-script|xx-mobile-nav-final|xx-nav-label-sync|xx-table-fix-final)["\'][^>]*>.*?</script>\s*',
    re.I | re.S,
)
LEGACY_NAV_COMMENT = re.compile(
    r'<!-- 玹翔旅遊｜v7\.1 統一導覽列｜手機點擊式下拉 -->\s*'
    r'(?:<!-- =+\s*玹翔旅遊｜全站統一導覽列 FINAL\s*新手小白改法：改 href 與文字即可，全站建議使用同一段。\s*=+ -->\s*)?'
    r'(?:<!-- 玹翔旅遊｜新版黑金高端三層導覽列 END -->\s*)?',
    re.I | re.S,
)
LEGACY_FOOTER_COMMENT = re.compile(r'<!-- ===== 玹翔旅遊｜全站統一三欄式聯繫方式 Ultimate Final v7\.0 ===== -->\s*', re.I)
FONT_STYLESHEET = re.compile(r'<link\b(?=[^>]*\bhref=["\']https://fonts\.googleapis\.com/css2[^"\']*["\'])[^>]*>\s*', re.I)
FONT_GOOGLEAPIS_PRECONNECT = re.compile(r'<link\b(?=[^>]*\brel=["\']preconnect["\'])(?=[^>]*\bhref=["\']https://fonts\.googleapis\.com["\'])[^>]*>\s*', re.I)
FONT_GSTATIC_PRECONNECT = re.compile(r'<link\b(?=[^>]*\brel=["\']preconnect["\'])(?=[^>]*\bhref=["\']https://fonts\.gstatic\.com["\'])[^>]*>\s*', re.I)

ASSET_REMAP = {
    "images/about/客製化包車.jpg": "images/客製化包車.png",
    "images/addons/addon-child-seat.jpeg": "images/addons/child-seat.png",
    "images/addons/addon-rear-facing-seat.jpeg": "images/addons/rear-facing-seat.png",
    "images/addons/addon-booster-seat.jpg": "images/addons/booster-seat.png",
    "images/addons/addon-pet-transfer.jpeg": "images/addons/pet-transfer.png",
    "images/addons/addon-sign-service.jpg": "images/addons/sign-service.png",
    "images/addons/addon-luggage-carry.jpeg": "images/addons/luggage-carry.png",
    "images/index/IMG_0726.jpg": "images/index/hero.jpg",
    "images/index/index-air.png": "images/index/airport.png",
    "images/index/index-sing.jpg": "images/index/concert.png",
    "images/banner/banner-home.webp": "images/index/hero.jpg",
    "images/uploads/upload-001.jpg": "images/uploads/concert.jpg",
    "images/vehicles/sprinter.jpg": "images/vehicles/sprinter.jpg",
    "images/VITO-2.jpg": "images/vehicles/vito.jpg",
    "images/接機指引.png": "images/接送機流程.png",
    "images/胖胖箱.jpg": "images/胖胖箱.png",
    "images/航班示意圖.jpg": "images/接機示意圖.png",
    "images/車照/CAMRY-2/comfort-cover.jpg": "images/vehicles/camry.jpg",
    "images/車照/rav4/251222_ToyotaRAV4-2_026_PhotoChen.png": "images/vehicles/rav4.png",
    "images/車照/ALPHARD-2/IMG_1570.JPG": "images/vehicles/alphard.jpg",
    "images/車照/Ｓ400/IMG_0476.JPG": "images/vehicles/s400-wedding.jpg",
}

ASSET_COPY = {
    "images/addons/child-seat.png": "images/正向安全座椅.png",
    "images/addons/rear-facing-seat.png": "images/反向安全座椅.png",
    "images/addons/booster-seat.png": "images/增高墊.png",
    "images/addons/pet-transfer.png": "images/寵物接送.PNG",
    "images/addons/sign-service.png": "images/舉牌服務.png",
    "images/addons/luggage-carry.png": "images/行李搬運.png",
    "images/index/hero.jpg": "images/upload-062.jpg",
    "images/index/airport.png": "images/機場接送.png",
    "images/index/concert.png": "images/演唱會接送.png",
    "images/uploads/concert.jpg": "images/upload-001.jpg",
    "images/vehicles/sprinter.jpg": "images/vehicles/sprinter.jpg",
    "images/vehicles/vito.jpg": "images/VITO.jpg",
    "images/vehicles/camry.jpg": "images/車照/CAMRY/comfort-cover.jpg",
    "images/vehicles/rav4.png": "images/車照/RAV4/251222_ToyotaRAV4_026_PhotoChen.png",
    "images/vehicles/alphard.jpg": "images/車照/ALPHARD/IMG_1570.JPG",
    "images/vehicles/s400-wedding.jpg": "images/車照/∩╝│400/IMG_0476.JPG",
}

MEMBER_PAGES = {"booking.html", "login.html", "register.html", "forgot-password.html", "member-center.html"}
TRIP_BOOKING_PAGES = {"hehuanshan-day.html", "smangus-day.html", "qingjing-sunmoonlake-day.html", "travel-smangus.html"}
ALIASES = {
    "member-login.html": ("login.html", "會員登入"),
    "member.html": ("member-center.html", "會員中心"),
}
def copy_assets() -> None:
    for destination, source in ASSET_COPY.items():
        source_path = ROOT / source
        destination_path = ROOT / destination
        if destination_path.exists():
            continue
        if not source_path.exists():
            raise FileNotFoundError(f"缺少來源圖片：{source}")
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, destination_path)


def ensure_head_tag(html: str, tag: str, marker: str) -> str:
    if marker in html:
        return html
    return html.replace("</head>", f"{tag}\n</head>", 1)


def ensure_meta_property(html: str, prop: str, content: str) -> str:
    if re.search(rf'<meta\b[^>]*property=["\']{re.escape(prop)}["\']', html, re.I):
        return html
    return html.replace("</head>", f'<meta property="{prop}" content="{content}">\n</head>', 1)


def dedupe_links(html: str, pattern: re.Pattern[str]) -> str:
    first = True

    def replace(match: re.Match[str]) -> str:
        nonlocal first
        if first:
            first = False
            return match.group(0)
        return ""

    return pattern.sub(replace, html)


def ensure_noindex(html: str) -> str:
    robots = re.compile(r'<meta\b[^>]*\bname=["\']robots["\'][^>]*>', re.I)
    tag = '<meta name="robots" content="noindex,follow">'
    if robots.search(html):
        return robots.sub(tag, html, count=1)
    return html.replace("</head>", f"{tag}\n</head>", 1)


def upgrade_html(path: Path) -> None:
    html = path.read_text(encoding="utf-8", errors="replace")
    html = html.replace("https://www.xuanxiangtravel.com", SITE_URL)
    html = html.replace("https://xuanxiang-travel.pages.dev", SITE_URL)
    html = html.replace("https://lin.ee/oQQR3Ej", "https://line.me/R/ti/p/@sco20240609")
    html = html.replace("https://lin.ee/TYGJ3VU", "https://line.me/R/ti/p/@sco20240609")
    html = re.sub(
        r'(<form\b[^>]*?)\saction=["\']https://line\.me/R/ti/p/@sco20240609["\']',
        r'\1 action="#" data-xx-line-form',
        html,
        flags=re.I,
    )
    html = re.sub(r'href=["\']https://line\.me/R/ti/p/@sco20240609["\']', 'href="#" data-xx-line-link', html, flags=re.I)
    html = re.sub(r'href=["\']tel:0972268295["\']', 'href="#" data-xx-phone-link', html, flags=re.I)
    html = re.sub(r"const LINE_URL\s*=\s*['\"]https://line\.me/R/ti/p/@sco20240609['\"];", "const LINE_URL = window.XUANXIANG_CONFIG.CONTACT.lineUrl;", html)
    html = re.sub(r"const APPS_SCRIPT_URL\s*=\s*['\"]https://script\.google\.com/macros/s/[^'\"]+/exec['\"];", "const APPS_SCRIPT_URL = window.XUANXIANG_CONFIG.APPS_SCRIPT_URL;", html)
    html = html.replace(
        "Firebase 下單：請到程式碼 firebaseConfig 填入你的專案資料；Cloudflare Pages 可直接上傳此資料夾或 ZIP。",
        "預約會送到共用 Apps Script 後端；LINE 與 API 網址都由全站設定檔統一管理，不需要修改本頁程式碼。",
    )
    html = re.sub(
        r'<script type="module">\s*// Firebase 正式串接區：.*?</script>\s*',
        "",
        html,
        count=1,
        flags=re.S,
    )
    html = LEGACY_BLACK_GOLD_NAV.sub("", html)
    html = LEGACY_CLICK_NAV_STYLE.sub("", html)
    html = LEGACY_INJECTED_STYLE.sub("", html)
    html = LEGACY_INJECTED_SCRIPT.sub("", html)
    html = LEGACY_NAV_COMMENT.sub("", html)
    html = LEGACY_FOOTER_COMMENT.sub("", html)
    html = re.sub(r'\sdata-xx-upgraded=["\']v7["\']', "", html, flags=re.I)
    html = html.replace("https://line.me/R/ti/p/@sco20240609", "{{XX_LINE_URL}}")
    html = html.replace("0972-268295", "{{XX_PHONE}}")
    html = html.replace("0972268295", "{{XX_PHONE_TEL}}")
    html = html.replace("xuanxiang0609@gmail.com", "{{XX_EMAIL}}")
    html = html.replace("@sco20240609", "{{XX_LINE_ID}}")
    for old, new in ASSET_REMAP.items():
        html = html.replace(old, new)
    html = re.sub(r'((?:src|href)=["\'][^"\']*?)\s+(["\'])', r"\1\2", html)
    html = dedupe_links(html, FONT_STYLESHEET)
    html = dedupe_links(html, FONT_GOOGLEAPIS_PRECONNECT)
    html = dedupe_links(html, FONT_GSTATIC_PRECONNECT)
    html = re.sub(r',"aggregateRating":\{"@type":"AggregateRating","ratingValue":"[^"]+","reviewCount":"[^"]+"\}', "", html)

    if path.name == "hehuanshan-day.html":
        html = html.replace("\n:root{\n:root{", "\n<style>\n:root{", 1)
    if path.name == "airport-pricing.html":
        html = re.sub(
            r'/\* =+\s*導覽列｜桌機版\s*=+ \*/.*?(?=/\* =+\s*Hero 主視覺區)',
            "",
            html,
            count=1,
            flags=re.S,
        )
        html = re.sub(
            r'/\* =+\s*Footer\s*=+ \*/.*?(?=\.seo-soft\{)',
            "",
            html,
            count=1,
            flags=re.S,
        )
        html = re.sub(
            r'(/\* =+\s*手機版導覽與表格\s*=+ \*/\s*@media\(max-width:980px\)\{).*?\.cards,.pricing-note,.xx-footer-wrap\{grid-template-columns:1fr\}\s*\}',
            r"\1\n  .cards,.pricing-note{grid-template-columns:1fr}\n}",
            html,
            count=1,
            flags=re.S,
        )
        html = re.sub(
            r'\s*\.xx-float\{.*?\}\s*\.xx-float a\{.*?\}\s*body\{padding-bottom:74px\}',
            "",
            html,
            count=1,
            flags=re.S,
        )
    if path.name in TRIP_BOOKING_PAGES:
        html = re.sub(
            r'(<input\b[^>]*\bid=["\']tourDate["\'][^>]*?)\s+value=["\']2026-06-01["\']\s+min=["\']2026-06-01["\']\s+max=["\']2026-12-31["\']',
            r"\1",
            html,
            count=1,
            flags=re.I,
        )
        if 'src="assets/js/trip-booking.js"' not in html:
            html = html.replace(
                "<script>\nconst LINE_URL = window.XUANXIANG_CONFIG.CONTACT.lineUrl;",
                '<script src="assets/js/trip-booking.js"></script>\n<script>\nconst LINE_URL = window.XUANXIANG_CONFIG.CONTACT.lineUrl;',
                1,
            )
        html = html.replace("const APPS_SCRIPT_URL = window.XUANXIANG_CONFIG.APPS_SCRIPT_URL;\n", "")
        html = html.replace("let isSubmitting = false;\n", "")
        if "const initialTourDate = window.XUANXIANG_TRIP_BOOKING.initDateInput" not in html:
            html = html.replace(
                "const LINE_URL = window.XUANXIANG_CONFIG.CONTACT.lineUrl;\n",
                "const LINE_URL = window.XUANXIANG_CONFIG.CONTACT.lineUrl;\n"
                "const initialTourDate = window.XUANXIANG_TRIP_BOOKING.initDateInput(document.getElementById('tourDate'));\n",
                1,
            )
        html = html.replace("date:'2026年6月1日',", "date:formatDate(initialTourDate),")
        html = re.sub(
            r'window\.submitOrder = async \(\) => \{.*?\n\};\n\nrenderOptions\(\);',
            (
                "window.submitOrder = () => window.XUANXIANG_TRIP_BOOKING.submit({\n"
                "  button: document.querySelector('.drawerPanel .btn.orange'),\n"
                f"  source:'{path.name}',\n"
                "  payload:orderData()\n"
                "});\n\nrenderOptions();"
            ),
            html,
            count=1,
            flags=re.S,
        )
    if path.name == "booking.html":
        html = re.sub(
            r'(<select\b[^>]*\bname=["\']service["\'][^>]*>).*?(</select>)',
            r'\1<option value="">載入服務項目中...</option>\2',
            html,
            count=1,
            flags=re.I | re.S,
        )
        html = re.sub(r'\sdata-require-member=["\']true["\']', "", html, flags=re.I)
    html = HEADER.sub("", html)
    html = FOOTER.sub("", html)
    html = FLOAT.sub("", html)
    html = MEMBER_HELPER.sub("", html)
    html = re.sub(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>[^<]*"@type"\s*:\s*"LocalBusiness"[^<]*</script>\s*', "", html, flags=re.I)
    html = REMOVE_SCRIPT.sub("", html)
    html = REMOVE_STYLE.sub("", html)
    html = re.sub(r'<span\b[^>]*class=["\'][^"\']*\bxx-anchor-alias\b[^"\']*["\'][^>]*>\s*</span>\s*', "", html, flags=re.I)
    html = re.sub(r'<div\b[^>]*id=["\'](?:app-nav|app-footer|floating-contact|xx-site-header|xx-site-footer|xx-site-floating)["\'][^>]*>\s*</div>\s*', "", html, flags=re.I)
    html = re.sub(r'\sdata-xx-layout=["\'][^"\']*["\']', "", html, flags=re.I)

    canonical = SITE_URL + ("/" if path.name == "index.html" else f"/{path.name}")
    if re.search(r'<link\b[^>]*rel=["\']canonical["\'][^>]*>', html, re.I):
        html = re.sub(r'<link\b[^>]*rel=["\']canonical["\'][^>]*>', f'<link rel="canonical" href="{canonical}">', html, count=1, flags=re.I)
    else:
        html = html.replace("</head>", f'<link rel="canonical" href="{canonical}">\n</head>', 1)
    if not re.search(r'<meta\b[^>]*name=["\']viewport["\']', html, re.I):
        html = html.replace("</head>", '<meta name="viewport" content="width=device-width,initial-scale=1">\n</head>', 1)
    if not re.search(r'<meta\b[^>]*name=["\']description["\']', html, re.I):
        html = html.replace("</head>", f'<meta name="description" content="{DEFAULT_DESCRIPTION}">\n</head>', 1)
    if path.name in NOINDEX:
        html = ensure_noindex(html)
    title = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
    description = re.search(r'<meta\b[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)', html, re.I)
    html = ensure_meta_property(html, "og:title", title.group(1).strip() if title else "玹翔旅遊")
    html = ensure_meta_property(html, "og:description", description.group(1).strip() if description else DEFAULT_DESCRIPTION)
    html = ensure_meta_property(html, "og:type", "website")
    html = ensure_meta_property(html, "og:image", f"{SITE_URL}/images/logo.jpg")
    html = ensure_head_tag(html, '<link rel="stylesheet" href="assets/css/xx-v8.css">', 'href="assets/css/xx-v8.css"')
    html = ensure_head_tag(html, '<script src="assets/js/config.js"></script>', 'src="assets/js/config.js"')
    html = re.sub(r"<body([^>]*)>", lambda match: f'<body{match.group(1)} data-xx-layout="v8">\n<div id="xx-site-header"></div>', html, count=1, flags=re.I)

    aliases = []
    if path.name == "register.html":
        aliases.append('<span id="third-party-bind" class="xx-anchor-alias" aria-hidden="true"></span>')
    if path.name == "transfer-policy.html":
        aliases.extend([
            '<span id="fleet" class="xx-anchor-alias" aria-hidden="true"></span>',
            '<span id="cancel" class="xx-anchor-alias" aria-hidden="true"></span>',
        ])
    member_script = '\n<script type="module" src="assets/js/member.js"></script>' if path.name in MEMBER_PAGES else ""
    scripts = f"""
{' '.join(aliases)}
<div id="xx-site-footer"></div>
<div id="xx-site-floating"></div>
<script src="assets/js/site-layout.js" defer></script>
<script src="assets/js/site.js" defer></script>
<script src="assets/js/pricing-freeze.js" defer></script>{member_script}
"""
    html = html.replace("</body>", f"{scripts}</body>", 1)
    path.write_text(html, encoding="utf-8")


def write_alias_pages() -> None:
    for page, (target, title) in ALIASES.items():
        canonical = f"{SITE_URL}/{target}"
        html = f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="0; url={target}">
  <title>{title}轉址中｜玹翔旅遊</title>
  <meta name="description" content="頁面已整併，正在前往玹翔旅遊{title}。">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="{canonical}">
  <link rel="stylesheet" href="assets/css/xx-v8.css">
  <script src="assets/js/config.js"></script>
</head>
<body data-xx-layout="v8">
<div id="xx-site-header"></div>
<main style="width:min(760px,calc(100% - 32px));margin:64px auto">
  <h1>{title}頁面已整併</h1>
  <p>正在前往新版頁面。若瀏覽器沒有自動轉址，請點擊 <a href="{target}">前往{title}</a>。</p>
</main>
<div id="xx-site-footer"></div>
<div id="xx-site-floating"></div>
<script src="assets/js/site-layout.js" defer></script>
<script src="assets/js/site.js" defer></script>
<script src="assets/js/pricing-freeze.js" defer></script>
</body>
</html>
"""
        (ROOT / page).write_text(html, encoding="utf-8")


def write_sitemap() -> None:
    rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for page in INDEXABLE:
        loc = SITE_URL + ("/" if page == "index.html" else f"/{page}")
        priority = "1.0" if page == "index.html" else "0.8"
        rows.append(f"  <url><loc>{loc}</loc><changefreq>weekly</changefreq><priority>{priority}</priority></url>")
    rows.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(rows) + "\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")


def cleanup() -> None:
    garbage = [
        path for path in ROOT.iterdir()
        if path.is_file() and path.name.startswith("README_") and path.name not in {"README_新手小白操作說明.txt"}
    ]
    for path in garbage:
        path.unlink()
    for relative in [
        "assets/js/firebase-config.js", "assets/js/firebase-init.js", "assets/js/login.js", "assets/js/main.js",
        "assets/js/xx-click-nav-final.js", "assets/js/xx-klook-v71.js", "assets/js/xx-member-guard.js",
        "assets/js/xx-pricing-freeze.js", "assets/js/xx-site-unify.js", "assets/js/xx-site.js",
        "firebase-config.js", "xx_terminal_fix.py",
    ]:
        path = ROOT / relative
        if path.exists():
            path.unlink()
    for path in (ROOT / "assets/css").glob("xx-*.css"):
        if path.name != "xx-v8.css":
            path.unlink()
    markers = ("╧", "Γ", "┬", "µ", "σ", "Φ", "�", "∩╝")
    html = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in ROOT.rglob("*.html"))
    for path in sorted(ROOT.rglob("*"), reverse=True):
        relative = str(path.relative_to(ROOT))
        if path.is_file() and any(marker in path.name for marker in markers) and relative not in html:
            path.unlink()
        elif path.is_dir() and any(marker in path.name for marker in markers):
            if relative + "/" not in html:
                shutil.rmtree(path, ignore_errors=True)
            else:
                try:
                    path.rmdir()
                except OSError:
                    pass


def main() -> None:
    copy_assets()
    cleanup()
    pages = sorted(ROOT.glob("*.html"))
    for page in pages:
        upgrade_html(page)
    write_alias_pages()
    write_sitemap()
    print(f"已升級 {len(pages)} 個根目錄 HTML")


if __name__ == "__main__":
    main()
