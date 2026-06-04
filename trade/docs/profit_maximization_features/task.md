# 利益最大化機能 実装タスクリスト

- `[x]` `api_server.py` の修正
  - `[x]` `bot_state` にトレイリング状態（最高値、最安値、有効フラグ）を追加
  - `[x]` 1時間足のKラインデータを取得し、MACDトレンド（UP/DOWN）を判定
  - `[x]` `macro_trend` と `trailing_state` を `decision_maker.py` に連携
- `[x]` `strategies/decision_maker.py` の修正
  - `[x]` トレイリングストップ（現物・FX両方）のロジック実装
  - `[x]` MTFトレンドによるエントリー制限（フィルター）実装
- `[x]` `dashboard/index.html` および `dashboard/app.js` の修正
  - `[x]` UIに「1時間足トレンド」の表示バッジ追加
  - `[x]` 設定画面に「トレイリングストップ発動幅」設定を追加
- `[x]` 動作確認と事後検証（Walkthroughの作成）
