# リアルタイム自動予算追従機能 実装タスク

- [x] `api_server.py` の `default_settings` に `"auto_budget_mode": "manual"` を追加
- [x] `api_server.py` の `bg_updater` 内で、`auto_budget_mode` が `manual` 以外の場合に総資産額から予算枠（`trade_amount_limit`, `margin_trade_amount_limit`, `reserved_margin_jpy`）を自動計算し、変更があれば `save_settings` を実行するロジックを追加
- [x] `dashboard/index.html` の予算設定エリアに、AUTO / MANUAL 切り替えのUI要素を追加
- [x] `dashboard/app.js` を改修し、以下の機能を追加：
  - [x] プリセットボタン押下時に、バックエンドへ `auto_budget_mode` と共に変更を送信
  - [x] 予算スライダーが手動操作された際に、自動的に `auto_budget_mode` を `manual` に切り替えてバックエンドへ送信
  - [x] 定期更新 (`updateDashboard`) 時に、AUTO モードであればスライダーの数値をサーバー側で計算された最新値に同期する
- [x] プログラムの動作確認（サーバーの再起動）
