# 玹翔旅遊 V38.3 Enterprise Final

乾淨版 Apps Script 專案。司機相關資料唯一來源為「司機資料」工作表。

## 司機資料欄位
A 司機姓名 / B 車號 / C 車型 / D 顏色 / E 手機號碼

## 訂單自動化
在訂單表選擇司機姓名後，onEdit 會寫入車號、車型、顏色、手機號碼固定快照，不再依賴公式。

## 升級入口
`upgradeV383Enterprise()`
