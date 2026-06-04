# FX専用予算スライダー追加とスパムエラー防止機能 タスクリスト

- [x] `dashboard/index.html` の更新
  - 「運用限度額」スライダーの下に「FX専用 運用限度額」スライダー（min="50000" max="1000000" step="10000" value="200000"など）を追加する。
- [x] `dashboard/app.js` の更新
  - 新規スライダー ID の取得・適用、およびサーバーへの保存ペイロードに `margin_trade_amount_limit` を追加する。
- [x] `api_server.py` の更新
  - `default_settings` に `margin_trade_amount_limit: 200000` を追加し、POSTデータから保存できるようにする。
  - バックグラウンド実行（`bg_updater`）でFX発注エラー（「不足しています」等のメッセージ）が返ってきた場合、成功時と同様に `margin_short_time` を更新させクールダウンさせるエラースパム防止機能を追加する。
- [x] `strategies/decision_maker.py` の更新
  - `margin_signal` 判定の `is_margin_full` 計算において、`trade_limit` の代わりに `margin_trade_amount_limit` を利用するようにロジックを分離する。
- [x] アプリケーションの再起動と動作テスト
- [x] `walkthrough.md` の作成・更新
