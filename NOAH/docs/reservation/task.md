# 予約システム導入タスク

## 概要
LINE (LIFF) 連携を含む予約システムの実装。

## タスク
- [x] `api/index.js` の改修 (予約API作成・データ構造更新) <!-- id: api_update -->
- [x] `public/index.html` の改修 (カレンダー30日化・予約フォーム・LINE連携) <!-- id: frontend_update -->
- [x] `public/admin.html` の改修 (予約確認機能) <!-- id: admin_update -->
- [x] 残席数に応じたボタン表示変更 (残りわずか) <!-- id: limited_display -->
- [x] スケジュール表示改善 (営業終了時の非表示化・タイトル変更) <!-- id: schedule_refinement -->
- [x] 完了メッセージの改善とモーダル化 (URL非表示対応) <!-- id: modal_success -->
