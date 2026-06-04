# 玹翔旅遊 Ultimate Final v8.0 長期營運版

本版本已將全站共用導覽列、Footer、浮動 LINE／電話、手機版選單、服務項目與旅遊活動集中管理。
機場、港口、登山與長途價目表只透過 Apps Script API 讀取，Google Sheet ID 不會放進公開 HTML。

## 日常維護

一般內容調整請先修改：

```text
assets/js/config.js
```

修改後執行：

```bash
python3 tools/upgrade_v8.py
python3 tools/validate_site.py
bash tools/build_packages.sh
```

## 第一次上線

請先閱讀：

```text
README_新手小白操作說明.txt
GitHub上傳_新手小白操作說明.txt
API串接正式版_新手一步一步教學.txt
```

Apps Script 後端正式版本位於：

```text
apps-script/Code.gs
```

旅遊活動頁的共用送單與日期防呆位於：

```text
assets/js/trip-booking.js
```

Cloudflare Pages 請上傳桌面的專用 ZIP，不要上傳完整原始碼 ZIP：

```text
玹翔旅遊_Ultimate_Final_v8.0_Cloudflare_Pages_上傳包.zip
```

部署後執行線上驗收：

```bash
python3 tools/check_live_deployment.py
```

Cloudflare Wrangler 完成瀏覽器登入後，也可以一鍵建立 ZIP、部署 Pages 並驗收：

```bash
bash tools/deploy_cloudflare_pages.sh
```
