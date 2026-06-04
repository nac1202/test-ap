# セリクラ逆張り機能 実装タスクリスト

- `[x]` `api_server.py` の修正
  - `[x]` デフォルト設定に `panic_buy_rsi`（初期値 20）を追加
  - `[x]` `/api/settings` の POST 処理で `panic_buy_rsi` を保存するように修正
- `[x]` `strategies/decision_maker.py` の修正
  - `[x]` `panic_buy_rsi` の設定値を引数または辞書から取得
  - `[x]` 現物買い条件で、`rsi <= panic_buy_rsi` なら MTFフィルター（macro_trend == "DOWN"）を無視して買いシグナルを発行
- `[x]` `dashboard/index.html` の修正
  - `[x]` 設定モーダルに「⚡ セリクラ逆張り 発動RSI」のスライダーUIを追加
- `[x]` `dashboard/app.js` の修正
  - `[x]` `panic_buy_rsi` の UIバインディング（表示・保存）を実装
  - `[x]` プリセットボタン（Safe/Normal/Aggressive）に `panic_buy_rsi` の設定値を追加
- `[x]` バックグラウンドサーバーの再起動と動作確認
