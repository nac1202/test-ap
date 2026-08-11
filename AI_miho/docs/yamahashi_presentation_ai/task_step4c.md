# Step 4C: 実E5モデル配備・検索品質評価 実装タスク

## 1. モデル準備・配置基盤の構築
- `[x]` `scripts/setup_model.py` の作成 (管理者専用, UI等からの自動実行禁止)
- `[x]` `huggingface_hub` を利用した特定revision (`intfloat/multilingual-e5-small`) のダウンロード機能
- `[x]` モデルファイルのSHA-256、ファイルサイズ、manifest作成日時の取得と `manifest.json` の作成
- `[x]` 一時ディレクトリでの取得後、完全性確認後に許可ディレクトリへの配置・保存
- `[x]` モデル・依存パッケージ（sentence-transformers, transformers, torch, faiss-cpu等）のライセンス情報の記録

## 2. 実モデルの読み込みと整合性検証
- `[x]` `LocalSentenceTransformerProvider` の改修 (`local_files_only=True`, `trust_remote_code=False`)
- `[x]` 読み込み時の `manifest.json` 検証（ファイル改ざん・欠損の検出）
- `[x]` モデル未配置時の安全な停止と日本語エラー出力

## 3. E5入力形式の分離と正規化
- `[x]` `query: ` および `passage: ` 接頭辞の厳密な付与
- `[x]` 接頭辞の二重付与防止、空文字、長文、改行のハンドリング
- `[x]` 出力次元の確認 (384) と L2正規化の確認
- `[x]` これらを検証する単体テストの作成

## 4. 品質評価データとスクリプト拡充 (`evaluate_search.py`)
- `[x]` 自然な日本語の質問（同義語、否定表現、無関係な質問など）を含む評価セットの作成
- `[x]` 実測環境（モデルID、revision、k値、seed、ハードウェア等）の実行時記録
- `[x]` 各方式 (LIKE, FTS5, Mock, 実E5 Vector/Hybrid) での Recall, MRR, 検索時間の測定

## 5. 性能計測の実装
- `[x]` モデル初回/2回目読み込み時間の計測
- `[x]` query/passageの埋め込み処理時間（バッチ含む）の計測
- `[x]` FAISS/Hybrid検索時間、メモリ使用量、インデックスサイズの計測

## 6. stale（旧データ）管理とモデル切替ロジック
- `[x]` Mockと実モデルのEmbeddingIDの分離
- `[x]` モデル変更に伴う既存Embeddingのstale化処理
- `[x]` 古いEmbeddingが検索結果に混入しないことの単体テスト

## 7. 外部通信検証
- `[x]` `setup_model.py` 実行時の接続先・取得元ログの出力
- `[x]` 通常検索時に `socket.connect` および `socket.getaddrinfo` の呼び出しを監視・遮断するテストの作成（通信なしの確認）

## 8. デモスクリプトの改修 (`demo_search.py`)
- `[x]` `--embedding real` フラグの追加
- `[x]` デモ出力項目の追加（モデルID、revision、次元数、絶対パス隠蔽、各検索方式の順位、検索時間）

## 9. 完了報告 (Walkthrough)
- `[x]` 実機実測に基づくStep 4C完了報告書の作成
- `[x]` 「実装済み・実モデル検証完了」のステータス明記
