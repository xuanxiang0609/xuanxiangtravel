from pathlib import Path

root = Path(".")
html_files = [p for p in root.glob("*.html")]

css_link = '<link rel="stylesheet" href="assets/css/xx-site-unify.css">'
js_link = '<script src="assets/js/xx-site-unify.js"></script>'

Path("assets/css").mkdir(parents=True, exist_ok=True)
Path("assets/js").mkdir(parents=True, exist_ok=True)

Path("assets/css/xx-site-unify.css").write_text(r'''
.xx-site-contact-hub{width:min(1180px,calc(100% - 40px));margin:56px auto}
.xx-site-contact-panel{border:1px solid rgba(216,181,109,.3);border-radius:30px;padding:34px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(216,181,109,.06));box-shadow:0 26px 70px rgba(0,0,0,.42)}
.xx-site-contact-panel h2{color:#fff0b8;font-size:clamp(30px,4vw,46px)}
.xx-site-contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.xx-site-contact-item{display:flex;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid rgba(216,181,109,.2);border-radius:18px;background:rgba(255,255,255,.045);color:#fff8e8!important;text-decoration:none!important;font-weight:850}
.xx-site-contact-item small{color:#fff0b8}
@media(max-width:980px){.xx-site-contact-grid{grid-template-columns:1fr}.drop-list{display:none!important}.drop.active>.drop-list{display:flex!important;flex-direction:column}}
''', encoding="utf-8")

Path("assets/js/xx-site-unify.js").write_text(r'''
document.addEventListener("DOMContentLoaded",()=>{
  const nav=document.querySelector(".nav-links,.xx-menu,nav");
  if(nav){
    nav.innerHTML=`
<a href="index.html">主頁</a><a href="about.html">關於玹翔</a>
<span class="drop"><span class="drop-btn">服務項目</span><span class="drop-list">
<a href="airport-pricing.html">機場接送</a><a href="port-pricing.html">港口接送</a><a href="tour-pricing.html">旅遊包車</a><a href="mountain-pricing.html">登山包車</a><a href="long-distance-pricing.html">長途接送</a><a href="business-transfer.html">商務包車</a><a href="pet-transfer.html">寵物接送</a><a href="wedding-car.html">結婚禮車</a><a href="concert-transfer.html">演唱會專車</a><a href="car-rental.html">租車服務</a><a href="store-cooperation.html">店家合作</a><a href="driver-recruit.html">招募司機</a>
</span></span>
<a href="booking.html">VIP預約商城</a><a href="vehicles.html">車款介紹</a>
<span class="drop"><span class="drop-btn">旅遊活動</span><span class="drop-list">
<a href="travel-one-day.html">九人座專車Ｉ包車</a><a href="travel-two-days.html">明星保母車 專車Ｉ包車</a><a href="travel-three-days.html">多日包車</a><a href="travel-region.html">各地區搜尋</a><a href="travel-charter.html">包車服務總覽</a>
</span></span>
<a href="concert-transfer.html">演唱會攻略</a><a href="charter-policy.html">條款政策</a><a href="login.html">會員登入</a>`;
  }

  document.querySelectorAll(".drop-btn").forEach(btn=>{
    btn.addEventListener("click",e=>{
      if(innerWidth>980)return;
      e.preventDefault();
      btn.parentElement.classList.toggle("active");
    });
  });

  if(!document.querySelector(".xx-site-contact-hub")){
    const s=document.createElement("section");
    s.className="xx-site-contact-hub";
    s.innerHTML=`<div class="xx-site-contact-panel"><h2>聯絡玹翔旅遊</h2><div class="xx-site-contact-grid">
<a class="xx-site-contact-item" href="tel:0972268295"><small>電話</small><span>0972-268295</span></a>
<a class="xx-site-contact-item" href="mailto:xuanxiang0609@gmail.com"><small>Gmail</small><span>xuanxiang0609@gmail.com</span></a>
<a class="xx-site-contact-item" href="https://line.me/R/ti/p/@sco20240609"><small>LINE</small><span>@sco20240609</span></a>
<a class="xx-site-contact-item" href="https://wa.me/886972268295"><small>WhatsApp</small><span>(+886)972268295</span></a>
<a class="xx-site-contact-item" href="weixin://dl/chat?sco20240609"><small>WeChat</small><span>sco20240609</span></a>
<a class="xx-site-contact-item" href="https://www.instagram.com/xuanxiang0609"><small>IG</small><span>xuanxiang0609</span></a>
</div></div>`;
    const f=document.querySelector("footer");
    f?f.before(s):document.body.appendChild(s);
  }
});
''', encoding="utf-8")

for p in html_files:
    s = p.read_text(encoding="utf-8", errors="ignore")
    if css_link not in s:
        s = s.replace("</head>", css_link + "\n</head>")
    if js_link not in s:
        s = s.replace("</body>", js_link + "\n</body>")
    s = s.replace("LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_ACCESS_TOKEN_請放後端")
    s = s.replace("LINE_ADMIN_IDS", "LINE_ADMIN_IDS_請放後端")
    p.write_text(s, encoding="utf-8")

print(f"完成：已處理 {len(html_files)} 個 HTML")
