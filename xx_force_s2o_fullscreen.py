from pathlib import Path
import re

p = Path("S2O.html")
s = p.read_text(encoding="utf-8", errors="ignore")

backup = Path("backup")
backup.mkdir(exist_ok=True)
(backup / "S2O_before_force_fullscreen.html").write_text(s, encoding="utf-8")

force_css = r'''
<style id="xx-force-s2o-fullscreen">
/* 玹翔旅遊｜S2O 強制整頁首屏修正版 */
html,body{
  margin:0!important;
  padding:0!important;
  background:#030303!important;
  color:#fff!important;
  font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif!important;
}

/* 隱藏過高雜訊列 */
body > nav,
body > .breadcrumb,
body > .subnav,
body > .top-links{
  display:none!important;
}

/* Header 強制壓縮 */
header{
  position:sticky!important;
  top:0!important;
  z-index:9999!important;
  min-height:64px!important;
  background:rgba(0,0,0,.86)!important;
  backdrop-filter:blur(14px)!important;
  border-bottom:1px solid rgba(216,179,90,.25)!important;
}

header *{
  max-height:none!important;
}

header img{
  width:48px!important;
  height:48px!important;
  object-fit:cover!important;
  border-radius:14px!important;
}

/* 第一個主要 section 直接放大 */
main > section:first-child,
body > section:first-of-type{
  min-height:calc(100vh - 64px)!important;
  padding:72px 5vw 64px!important;
  display:flex!important;
  align-items:center!important;
  background:
    radial-gradient(circle at 58% 48%,rgba(216,179,90,.22),transparent 34%),
    linear-gradient(180deg,#020202,#090805 52%,#020202)!important;
}

/* section 內層容器 */
main > section:first-child > *,
body > section:first-of-type > *{
  width:min(100%,1400px)!important;
  margin-left:auto!important;
  margin-right:auto!important;
}

/* 有 grid 的全部放大 */
main > section:first-child [class*="grid"],
body > section:first-of-type [class*="grid"]{
  display:grid!important;
  grid-template-columns:1.05fr .95fr!important;
  gap:56px!important;
  align-items:center!important;
}

/* 首屏標題強制放大 */
main > section:first-child h1,
body > section:first-of-type h1{
  font-size:clamp(48px,5.8vw,86px)!important;
  line-height:1.05!important;
  letter-spacing:-.05em!important;
  margin:0 0 24px!important;
  color:#fff8df!important;
  text-shadow:0 18px 60px rgba(0,0,0,.55)!important;
}

/* 首屏文字 */
main > section:first-child p,
body > section:first-of-type p{
  font-size:clamp(17px,1.45vw,21px)!important;
  line-height:1.95!important;
  color:#d9cfb6!important;
  max-width:680px!important;
}

/* 首屏圖片強制變大 */
main > section:first-child img,
body > section:first-of-type img{
  width:100%!important;
  max-width:620px!important;
  height:auto!important;
  border-radius:28px!important;
  box-shadow:
    0 32px 95px rgba(0,0,0,.6),
    0 0 0 1px rgba(216,179,90,.35)!important;
}

/* 按鈕高級化 */
main > section:first-child a,
body > section:first-of-type a{
  border-radius:999px!important;
  padding:14px 24px!important;
  font-weight:900!important;
}

/* 手機 */
@media(max-width:980px){
  main > section:first-child,
  body > section:first-of-type{
    padding:48px 22px 42px!important;
    min-height:auto!important;
  }

  main > section:first-child [class*="grid"],
  body > section:first-of-type [class*="grid"]{
    grid-template-columns:1fr!important;
    gap:30px!important;
  }

  main > section:first-child h1,
  body > section:first-of-type h1{
    font-size:clamp(38px,12vw,56px)!important;
  }
}
</style>
'''

if 'id="xx-force-s2o-fullscreen"' not in s:
    s = s.replace("</head>", force_css + "\n</head>")

# 強制修正可能破圖路徑
s = s.replace("Images/", "images/")
s = s.replace("/Images/", "/images/")
s = s.replace("./Images/", "./images/")

p.write_text(s, encoding="utf-8")
print("DONE｜S2O.html 已強制寫入整頁首屏修正")
