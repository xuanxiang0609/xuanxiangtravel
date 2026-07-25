# V38.3 Enterprise Final
- 移除 Fleet.js 與全部 Fleet / VehicleCard / 車卡正式引用。
- 將「司機資料」設定為唯一資料來源。
- 新增 onEdit 司機資料自動帶入。
- 升級時自動移轉舊車卡資料後刪除舊工作表。
- 重建資料驗證、條件格式、保護欄位。
- 訂單司機欄位改為固定值快照，不再使用公式。
- Dashboard 可派遣司機統計改讀司機資料。
- 版本更新為 38.3.0。


## V38.3.1 Hotfix
- 修正 Google 試算表輸入欄／表格欄禁止設定數字格式時，升級流程中斷的問題。
- 數字格式失敗改為記錄警告並安全略過，不影響其餘升級程序。

## V39.0.0 Enterprise Alpha

日期：2026-07-25

### 開發基線

- 以 V38.3 Enterprise Final SSOT 為穩定基礎
- 建立獨立 Git 分支：v39-enterprise
- 正式版 V38.3 不直接修改
- 司機資料持續採用 Single Source of Truth

### 規劃模組

- 派車行事曆
- 排班衝突偵測
- Google Maps 路線與里程
- Dashboard 2.0
- AI 智慧派車

### 第一階段

- 啟用排班衝突偵測核心
- 其餘 V39 功能預設關閉
