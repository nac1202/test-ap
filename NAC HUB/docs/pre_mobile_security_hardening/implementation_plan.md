# v1.3.0完了後 セキュリティ補正・進捗整合性監査 実装計画

PC版基本機能（12フェーズ）完了に伴い、漏洩済み認証情報の安全なローテーション、環境変数のGit保護強化、コマンド実行時の秘密情報露出防止、および進捗ドキュメントの記載正確性監査を実施します。

---

## 補正・実施方針

1. **秘密情報監査・ローテーション**:
   - ログ等に平文露出した PostgreSQL パスワードおよび JWT SECRET_KEY を暗号学的に安全なランダム値へローテーション。
   - `.env`, `.env.test` を暗号化・ローテーション更新し、`.gitignore` で完全遮断。
   - `.env.example`, `.env.test.example` にはプレースホルダー（`CHANGE_ME_...`）を設定。
   - コマンドライン引数へ `DATABASE_URL` やパスワードを直接埋め込む形式を完全廃止。テストコード側に `.env.test` 自動安全読み込みロジックを統合。

2. **外部バックアップ**:
   - パスワードローテーション実施直前に、プロジェクト外ディレクトリ `D:\Antigravity\backups\NAC_HUB_pre_secret_rotation_20260726_161500` へDB全ダンプおよび設定バックアップを安全保存。

3. **進捗ドキュメント正確性補正**:
   - `progress_summary.md` にて「残っている課題」を明確化（各管理画面のAPI化、外部連携本接続、本番環境構築、スマホ・タブレット対応等）。
   - lint 実行状況（`oxlint` 0 Error）を正確に記載。

---

## 変更対象ファイル

1. **[MODIFY] [.gitignore](file:///d:/Antigravity/data/NAC%20HUB/.gitignore)**: `.env*`, `backend/.env*` の完全除外ルール強化
2. **[MODIFY] [.env.example](file:///d:/Antigravity/data/NAC%20HUB/.env.example)**: プレースホルダーへの変更
3. **[NEW] [.env.test.example](file:///d:/Antigravity/data/NAC%20HUB/.env.test.example)**: テスト環境用プレースホルダーファイル
4. **[MODIFY] [requirements.txt](file:///d:/Antigravity/data/NAC%20HUB/backend/requirements.txt)**: `httpx==0.27.2` バージョン固定
5. **[MODIFY] [test_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_api.py)**: `.env.test` 自動安全ロードおよび `engine` 再バインド処理の追加
6. **[MODIFY] [test_projects_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_projects_api.py)**: `.env.test` 自動安全ロードおよび `engine` 再バインド処理の追加
7. **[MODIFY] [test_dashboard_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_dashboard_api.py)**: `.env.test` 自動安全ロードおよび `engine` 再バインド処理の追加
8. **[MODIFY] [progress_summary.md](file:///d:/Antigravity/data/NAC%20HUB/progress_summary.md)**: 進捗・残項目およびセキュリティ・lint結果の完全同期

---

## 検証計画

1. **Docker Compose 再構築 & ヘルスチェック**: `docker compose down`, `docker compose up -d`, `/health` 動作確認
2. **自動テスト群 (平文秘密情報なしで実行)**:
   - `docker compose exec backend python test_dashboard_api.py`
   - `docker compose exec backend python test_projects_api.py`
   - `docker compose exec backend python test_api.py`
3. **型チェック & ビルド & lint**: `npx tsc --noEmit`, `npm run build`, `npm run lint` (0エラー)
4. **Git ステータス監査**: 実値環境ファイルやバックアップの混入なしを確認
