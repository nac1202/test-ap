# タスクリスト: 為替FX自動取引システムの構築

- [ ] 新規プロジェクトフォルダ（例: `d:\Antigravity\data\fx`）を作成し、ソースコード一式をコピーする
- [ ] コピー先の Python 仮想環境 (`.venv`) を作成し、依存パッケージをインストールする
- [ ] `fetchers/market_data.py` を為替FX API（`forex-api.coin.z.com`）向けに修正する
- [ ] `strategies/decision_maker.py` を為替相場用に調整（F&G Indexの削除など）する
- [ ] `execution/order_manager.py` を為替FXの発注単位（例: 10,000通貨単位など）に対応させる
- [ ] `api_server.py` のポートを `5001` に変更し、取得データを為替用に修正する
- [ ] `dashboard/` 内の表示（BTC ➔ USD/JPY など）を変更する
- [ ] 新規アプリを起動し、APIデータ取得およびダッシュボード表示の検証を行う
