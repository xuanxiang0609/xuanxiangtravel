from pathlib import Path
from datetime import datetime
import html

ROOT = Path.cwd()

# 如果正式網域還沒綁定，先用 Firebase Hosting 網址
SITE_URL = "https://xuanxiang-travel.web.app"

EXCLUDE_NAMES = {
    "404.html",
    "README.html",
    "content-merged.html",
}

EXCLUDE_PREFIXES = (
    "admin/",
    "docs/",
    "reports/",
    "tools/",
    "__MACOSX/",
)

# 這些是整併／轉址用途，不放 sitemap
EXCLUDE_EXACT = {
    "business-transfer.html",
    "concert-transfer.html",
}

html_files = []

for p in sorted(ROOT.rglob("*.html")):
    rel = p.relative_to(ROOT).as_posix()

    if rel in EXCLUDE_EXACT:
        continue

    if p.name in EXCLUDE_NAMES:
        continue

    if rel.startswith(EXCLUDE_PREFIXES):
        continue

    if " " in p.name and p.stem.endswith(" 2"):
        continue

    html_files.append(rel)

urls = []

for rel in html_files:
    if rel == "index.html":
        loc = SITE_URL + "/"
        priority = "1.0"
    else:
        # Firebase cleanUrls: xxx.html 對外用 /xxx
        clean = rel[:-5] if rel.endswith(".html") else rel
        loc = SITE_URL + "/" + clean
        priority = "0.8"

    urls.append(f"""  <url>
    <loc>{html.escape(loc)}</loc>
    <lastmod>{datetime.now().date().isoformat()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>{priority}</priority>
  </url>""")

sitemap = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
""" + "\n".join(urls) + """
</urlset>
"""

(ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")

robots = f"""User-agent: *
Allow: /

Disallow: /admin/
Disallow: /docs/
Disallow: /reports/
Disallow: /tools/
Disallow: /README.html
Disallow: /content-merged.html
Disallow: /404.html

Sitemap: {SITE_URL}/sitemap.xml
"""

(ROOT / "robots.txt").write_text(robots, encoding="utf-8")

print("✅ sitemap.xml 已重建")
print("✅ robots.txt 已重建")
print(f"收錄頁面數：{len(urls)}")
print(f"Sitemap: {SITE_URL}/sitemap.xml")
