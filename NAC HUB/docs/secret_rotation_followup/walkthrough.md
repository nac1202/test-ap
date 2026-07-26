# v1.3.1 秘密情報再ローテーション・環境補正 ウォークスルー

JWT秘密鍵および初期管理者認証情報の再ローテーション、平文バックアップファイルの安全削除、DBダンプファイルのパーミッション制限、およびDockerコンテナの完全クリーン再ビルドを完了しました。

---

## 実施内容の概要

1. **PostgreSQL認証情報**: 前工程にて無害な安全値へローテーション済み（変更なし・DBデータ100%保持）。
2. **JWT秘密鍵の再ローテーション**:
   - 開発環境 (`.env`) および テスト環境 (`.env.test`) 用に、それぞれ異なる暗号学的に安全なランダム値を生成・適用。
   - 旧JWTトークンで保護APIへアクセスした場合に `401 Unauthorized` で適切に拒否されることを確認。
3. **管理者認証情報の再設定**:
   - `.env` および PostgreSQL データベース内の初期管理者アカウント (`admin@example.com`) のパスワードを新しい安全なランダム値で再設定。
   - 新しい一時パスワードは Git 管理外の安全な外部ファイル `D:\Antigravity\secrets\NAC_HUB\initial_admin_password.txt` にのみ非公開保存（ファイルアクセス権を現在のWindowsユーザーに制限）。
   - 管理者のアカウントフラグを `must_change_password = True` に設定し、次回ログイン時に本人用の新パスワードへの変更を強制化。
4. **平文環境バックアップの削除 & DBダンプ制限**:
   - 事前バックアップディレクトリ内の平文環境ファイル `env.bak` および `env_test.bak` を完全削除。
   - `db_dump.sql` は保持し、アクセス権限を現在のWindowsユーザーのみに制限。
   - ベースラインバックアップ `D:\Antigravity\backups\NAC_HUB_baseline_20260725_130909` は一切未変更。
5. **Dockerコンテナ完全ノーキャッシュ再ビルド**:
   - `docker compose down` および `docker compose build --no-cache backend frontend` を実行。
   - コンテナ内への手動 `pip install` に頼ることなく、`requirements.txt` のみで完全クリーン構築・自動テスト全件成功。

---

## 検証結果まとめ

| 検証項目 | 実行結果 |
|---|---|
| `docker compose ps` | 3コンテナ全て `Up` (健全性確認) ✅ |
| `http://localhost:8000/health` | `status: ok`, `database: healthy` ✅ |
| バックエンド自動テスト `test_dashboard_api.py` | **100% PASSED** (手動 pip install なし) ✅ |
| バックエンド自動テスト `test_projects_api.py` | **100% PASSED** (手動 pip install なし) ✅ |
| バックエンド自動テスト `test_api.py` | **100% PASSED** (手動 pip install なし) ✅ |
| フロントエンド型チェック (`npx tsc --noEmit`) | **0 Error** ✅ |
| フロントエンドビルド (`npm run build`) | **0 Error (成功)** ✅ |
| コード品質 Lint (`npm run lint` / `oxlint`) | **0 Error (9 Warnings)** ✅ |
| ブラウザ回帰確認 | 旧JWT拒否、初期パスワード変更強制、動的画面レンダリング、`must_change_password = True` 復元確認完了 ✅ |

---

## セキュリティ宣言
- 本ドキュメント、コミットログ、スクリプト実行結果、最終報告において、新旧認証情報の実値、文字数、部分文字列等は一切掲載・露出されていません。
