from pathlib import Path
import re

ROOT = Path(".")

HTML_FILES = list(ROOT.glob("*.html"))

CSS_TAG = '<link rel="stylesheet" href="assets/css/xx-enterprise-v10.css">'
HEADER = '<div id="xx-site-header"></div>'
FOOTER = '''
<div id="xx-site-footer"></div>
<div id="xx-site-floating"></div>

<script src="assets/js/config.js"></script>
<script src="assets/js/site-layout.js"></script>
<script src="assets/js/site.js"></script>
<script src="assets/js/xx-enterprise-v10.js"></script>
'''

for file in HTML_FILES:

    html = file.read_text(encoding="utf-8", errors="ignore")

    html = html.replace(
        '<script src="assets/js/site-layout.js" defer></script>\n<script src="assets/js/site.js" defer></script>',
        ''
    )

    html = html.replace(
        '<script src="assets/js/site-layout.js"></script>\n<script src="assets/js/site.js"></script>',
        ''
    )

    if "xx-enterprise-v10.css" not in html:
        html = html.replace("</head>", f"  {CSS_TAG}\n</head>")

    if "xx-site-header" not in html:
        html = re.sub(
            r"<body([^>]*)>",
            rf"<body\1>\n{HEADER}",
            html,
            count=1,
            flags=re.IGNORECASE
        )

    if "xx-enterprise-v10.js" not in html:
        html = html.replace(
            "</body>",
            FOOTER + "\n</body>"
        )

    file.write_text(html, encoding="utf-8")

    print("升級完成:", file.name)

print("\nEnterprise V11 注入完成")