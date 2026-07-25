# V39.2.4 Dispatch Week View

## 功能說明

Week View 負責顯示指定週次的派車排班，將七日訂單依日期分組，並重用 Shared Dispatch Card 元件呈現派車資訊。

## Feature Package

- `WeekViewService.js`
  - 週日期範圍計算
  - 讀取七日派車事件
  - 依日期分組與排序
  - 建立週摘要

- `DispatchWeekView.html`
  - Week View 主畫面
  - 週日期導覽
  - 七日欄位容器
  - Loading／Error／Empty State

- `DispatchWeekView.css`
  - 本機原始樣式
  - 七日 Grid
  - 日期欄位
  - 響應式版面

- `DispatchWeekView.js`
  - 純前端 Render Engine
  - 不包含 google.script.run
  - 重用 Shared Dispatch Card

- `DispatchWeekViewCss.html`
  - Apps Script CSS HTML Partial

- `DispatchWeekViewJs.html`
  - Apps Script JavaScript HTML Partial

- `WeekViewController.js`
  - Payload API
  - HtmlService
  - Sidebar／Modeless Dialog
  - HTML Partial 白名單

## 對外 API

預計提供：

- `getWeekViewPayload(date)`
- `showWeekView(date, mode)`
- `showWeekViewSidebar(date)`
- `showWeekViewDialog(date)`

## 相依模組

- `V39/dayview/DayViewService.js`
- `V39/modules/CalendarService.js`
- `V39/shared/DispatchCard.html`
- `V39/shared/DispatchCardCss.html`
- `V39/shared/DispatchCardJs.html`
- `V39/shared/StatusColor.js`

## 開發原則

- 不重新建立另一套派車卡片
- 不直接修改 V38.3 正式模組
- Service／View／Render／Controller 分層
- 一個功能完成後建立一個 Commit
- 里程碑完成後才進行 clasp 測試部署

## 測試項目

- 指定日期能正確取得週一至週日範圍
- 跨月與跨年週次正確
- 七日事件依日期與時間排序
- 無資料日期顯示 Empty State
- 衝突訂單顯示警示
- 共用 Dispatch Card 正常渲染
- Sidebar／Dialog 正常開啟

## 已知限制

- 尚未支援拖曳派車
- 尚未支援即時修改排班
- 尚未整合 Google Maps
- 尚未整合 AI Dispatch
