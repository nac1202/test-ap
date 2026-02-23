# 管理画面「予約次第で営業」追加タスク

## 概要
管理画面の営業状態選択肢に「予約次第で営業」を追加する。

## タスク
- [x] `public/admin.html` の修正 <!-- id: update_admin_html -->
  - HTML: `<select>` に option 追加
  - CSS: 新しいステータス用のスタイル定義追加 (.status-on-demand)
  - JS: ラベル表示とクラス付与のロジック更新
- [x] デプロイ <!-- id: deploy -->
