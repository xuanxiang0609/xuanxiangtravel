from pathlib import Path
import re

root = Path(".")
html_files = list(root.glob("*.html")) + list(root.glob("**/*.html"))
css_files = list(root.glob("*.css")) + list(root.glob("**/*.css"))

def safe_read(p):
    try:
        return p.read_text(encoding="utf-8")
    except:
        return p.read_text(encoding="utf-8", errors="ignore")

def safe_write(p, s):
    p.write_text(s, encoding="utf-8")

# 1. 修正 HTML 圖片路徑大小寫與影片資料夾
for p in html_files + css_files:
    s = safe_read(p)
    old = s

    s = s.replace("Images/", "images/")
    s = s.replace("./Images/", "./images/")
    s = s.replace("/Images/", "/images/")
    s = s.replace("video/", "videos/")
    s = s.replace("./video/", "./videos/")
    s = s.replace("/video/", "/videos/")

    # 常見 Logo 路徑統一
    s = re.sub(r'(src=["\'])(?:\./)?images/(?:logo|LOGO)\.(png|jpg|jpeg|webp)(["\'])',
               r'\1images/logo.jpg\3', s)

    # CTA 文字統一
    s = s.replace("LINE 預約", "LINE客服")
    s = s.replace("LINE預約", "LINE客服")

    if s != old:
        safe_write(p, s)
        print("fixed path/text:", p)

# 2. 追加全站 v9.2 CSS 修正
css_path = root / "assets/css/xx-v92-s2o-fix.css"
css_path.parent.mkdir(parents=True, exist_ok=True)

css_path.write_text(r'''
/* =========================================================
   玹翔旅遊｜S2O v9.2 終端機一次修正版
   修正：Header 高度、Logo、Hero 比例、CTA、手機版
========================================================= */

:root{
  --xx-black:#050505;
  --xx-gold:#d8b35a;
  --xx-gold2:#f5d879;
  --xx-text:#fffaf0;
  --xx-muted:#cfc6ad;
  --xx-line:rgba(216,179,90,.25);
}

/* Header 壓縮 */
header,
.xx-header,
.site-header,
.navbar{
  min-height:60px !important;
  max-height:none !important;
}

.xx-header-inner,
.header-inner,
.nav-inner,
.navbar-inner{
  min-height:60px !important;
  padding-top:8px !important;
  padding-bottom:8px !important;
}

/* Logo 修正 */
.logo img,
.xx-logo img,
.site-logo img,
.brand img{
  width:52px !important;
  height:52px !important;
  object-fit:cover !important;
  border-radius:14px !important;
  background:#111 !important;
}

/* 避免破圖白方塊太突兀 */
img{
  max-width:100%;
}

img:not([src]),
img[src=""],
img[src="#"]{
  display:none !important;
}

/* Hero 放大到首頁視覺重點 */
.hero,
.xx-hero,
.s2o-hero,
.kv,
.main-hero{
  min-height:calc(100vh - 80px) !important;
  padding:96px 0 72px !important;
  display:flex;
  align-items:center;
  background:
    radial-gradient(circle at 52% 48%, rgba(216,179,90,.18), transparent 36%),
    linear-gradient(180deg,#020202 0%,#080704 48%,#020202 100%) !important;
}

.hero .container,
.xx-hero .container,
.s2o-hero .container,
.kv .container,
.main-hero .container{
  width:min(92%,1400px) !important;
  max-width:1400px !important;
  margin:auto !important;
}

.hero-grid,
.xx-hero-grid,
.s2o-hero-grid,
.kv-grid{
  display:grid !important;
  grid-template-columns:1.05fr .95fr !important;
  gap:56px !important;
  align-items:center !important;
}

/* 主標視覺 */
.hero h1,
.xx-hero h1,
.s2o-hero h1,
.kv h1{
  font-size:clamp(42px,5vw,76px) !important;
  line-height:1.08 !important;
  letter-spacing:-.04em !important;
  color:var(--xx-text) !important;
  margin-bottom:22px !important;
}

.hero p,
.xx-hero p,
.s2o-hero p,
.kv p{
  font-size:clamp(16px,1.4vw,20px) !important;
  line-height:1.9 !important;
  color:var(--xx-muted) !important;
}

/* Hero 圖片卡片放大 */
.hero img,
.xx-hero img,
.s2o-hero img,
.kv img{
  border-radius:28px !important;
  box-shadow:0 28px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(216,179,90,.28) !important;
}

.hero-media,
.xx-hero-media,
.s2o-hero-media,
.kv-media{
  min-height:520px !important;
  display:flex !important;
  align-items:center !important;
}

.hero-media img,
.xx-hero-media img,
.s2o-hero-media img,
.kv-media img{
  width:100% !important;
  height:auto !important;
}

/* CTA 統一 */
.btn,
.xx-btn,
.cta,
.button,
a[class*="btn"]{
  border-radius:999px !important;
  font-weight:800 !important;
  letter-spacing:.03em !important;
}

.btn-primary,
.xx-btn-primary,
.cta-primary,
a[href*="booking"],
a[href*="line.me"],
a[href*="lin.ee"]{
  background:linear-gradient(135deg,#f7db87,#b9892f) !important;
  color:#151008 !important;
  border:1px solid rgba(255,235,170,.45) !important;
  box-shadow:0 14px 34px rgba(216,179,90,.28) !important;
}

/* 固定 LINE 客服 */
.xx-floating-line,
.floating-line,
.line-float,
a[href*="line.me"].floating,
a[href*="lin.ee"].floating{
  position:fixed !important;
  right:24px !important;
  bottom:24px !important;
  z-index:9999 !important;
  padding:14px 22px !important;
}

/* 手機版 */
@media (max-width:980px){
  .hero,
  .xx-hero,
  .s2o-hero,
  .kv,
  .main-hero{
    min-height:auto !important;
    padding:72px 0 44px !important;
  }

  .hero-grid,
  .xx-hero-grid,
  .s2o-hero-grid,
  .kv-grid{
    grid-template-columns:1fr !important;
    gap:32px !important;
  }

  .hero h1,
  .xx-hero h1,
  .s2o-hero h1,
  .kv h1{
    font-size:clamp(36px,11vw,52px) !important;
  }

  .hero-media,
  .xx-hero-media,
  .s2o-hero-media,
  .kv-media{
    min-height:auto !important;
  }

  nav,
  .nav-links,
  .xx-nav-links{
    max-height:calc(100vh - 72px) !important;
    overflow-y:auto !important;
  }
}
''', encoding="utf-8")

print("created:", css_path)

# 3. 所有 HTML 自動掛上修正 CSS
link_tag = '<link rel="stylesheet" href="assets/css/xx-v92-s2o-fix.css">'
for p in html_files:
    s = safe_read(p)
    old = s
    if "xx-v92-s2o-fix.css" not in s:
        if "</head>" in s:
            s = s.replace("</head>", f"  {link_tag}\n</head>")
        elif "</HEAD>" in s:
            s = s.replace("</HEAD>", f"  {link_tag}\n</HEAD>")
    if s != old:
        safe_write(p, s)
        print("linked css:", p)

print("DONE｜玹翔旅遊 S2O v9.2 一次修正完成")
