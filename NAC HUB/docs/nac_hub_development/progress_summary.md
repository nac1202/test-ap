# Progress Summary

## 本ドキュメントの運用方針について (Single Source of Truth)
本ファイル `docs/nac_hub_development/progress_summary.md` をプロジェクトの進捗・サマリ管理の正本とします。プロジェクト直下に重複ファイルが存在する場合は削除し、二重管理を防止します。

## 現在のステータス
追加開発フェーズ9 完了 (v1.8.0 正式確定 / タグ: v1.8-plugin-management-api)

## 最新の作業内容 (追加開発フェーズ8: システム設定API化 完了)
1. **既存モデル・DB活用**:
   - 既存の `Company` モデル（会社名、コーポレートカラー、タイムゾーン）および `TenantSetting` モデル（システム表示名、お知らせ表示件数、メンテナンス案内表示）を活用。
   - 新規テーブル追加や破壊的マイグレーション（ALTER/DROP）を行わず、会社スコープ（`company_id`）で安全に永続化。
2. **APIエンドポイント実装**:
   - `GET /api/v1/admin/system-settings` (管理者用取得API・自社スコープ・初期値フォールバック完備)
   - `PUT /api/v1/admin/system-settings` (管理者用更新API・一般ユーザー403・入力バリデーション・監査ログ記録)
   - `GET /api/v1/system-settings/public` (未認証・一般ユーザー用公開設定API)
3. **監査ログ連携**:
   - システム設定変更時に `action="システム設定変更"` として記録。
   - 非SE向け平易な日本語（例: `システム表示名: 「旧」→「新」 / お知らせ表示件数: 「5件」→「7件」`）で変更差分要約を保存。秘密情報は完全非露出。
4. **共通UI動的反映 & ビルド番号統一**:
   - `frontend/src/contexts/SystemConfigContext.tsx` を新設し、アプリ全体で公開設定を共有。
   - PCサイドバー上部・下部、モバイルドロワー、ログイン画面へシステム表示名を動的反映。
   - サイドバー下部とシステム設定画面で表記を統一（`Ver 1.7.0` / `Build 20261021`）。
   - 設定保存時に `refetchConfig()` で即時反映（F5リロードなしで反映）。
5. **お知らせ表示件数連携**:
   - `backend/app/api/routers/dashboard.py` の固定 `.limit(5)` を廃止し、テナント設定 `notice_display_count`（1〜50件）を動的適用。
6. **メンテナンス案内バナー実装**:
   - `frontend/src/components/ui/MaintenanceBanner.tsx` を新設。
   - `maintenance_mode=true` 時に共通レイアウト上部（管理者時は赤帯直下、一般ユーザー時は最上段）およびログイン画面に注意喚起の黄色・アンバー系バナーを表示。OFF時は完全非表示。
7. **テスト・検証・手動E2E結果**:
   - ユーザー手動E2Eテスト：**ALL PASS** ✅
     - 設定取得／保存正常、F5後の永続化正常
     - システム表示名のPCサイドバー・モバイルドロワー・ログイン画面反映正常
     - バージョン／ビルド番号統一正常
     - ホーム画面お知らせ表示件数設定正常
     - メンテナンス案内ONで全共通画面・ログイン画面へ表示、OFFで非表示正常
     - 監査ログ記録正常、390×844を含む全画面表示正常
   - 自動テスト：全7バックエンドテストファイル（`test_system_settings_api.py` 全12ケース含む）完全PASS ✅
   - フロント静的チェック：`tsc`, `npm run build`, `npm run lint` すべてPASS ✅

## 次のステップ
- 次期フェーズまたは運用保守対応。



## 追加開発フェーズ9 進捗追記
### 現在のステータス: 追加開発フェーズ9 完了（v1.8.0 正式確定。手動E2E PASS）

### 追加開発フェーズ9: プラグイン管理API化
1. **既存モデル活用**: `plugin_configs`（company_id, plugin_name, is_active, config_json, last_tested_at）で要件を充足。新規migrationなし。
2. **プラグイン定義**: Slack / Google Drive / NotePM / HotBiz を `app/services/plugins/` のアダプター（validate・状態判定・設定確認）に一元化。DB行がなくても4件常時表示。
3. **API**: `GET /api/v1/admin/plugins`, `GET/PUT /{plugin_key}`, `POST /{plugin_key}/validate|enable|disable`（管理者限定・会社スコープ・未知キー404）。
4. **非機密設定のみ保存**: secret/token/password/key/credential等のキーは400で拒否。
5. **正直な状態表示**: 外部通信は未実装のため connected は常に false。「設定確認」は準備情報の検証のみで、接続成功とは表示しない。
6. **有効/無効**: 利用候補フラグ。接続状態とは分離。設定不足の有効化は不足項目を案内して400。
7. **監査ログ**: 「Slack設定変更」「Google Driveを有効化」「NotePM設定確認」「HotBizを無効化」等。
8. **Dashboard整合性**: integrations は connected=false を維持（変更なし）。
9. **検証**: 新規20テスト＋既存回帰PASS、tsc/build/lint PASS。
10. **監査ログ関連の追加対応**:
    - プラグイン操作の監査ログ details を dict 形式で保存し、画面表示を復旧（2abffb3）。
    - お知らせ系監査ログを非SE向け日本語表示に整理（00aa403）。
    - 監査ログ検索を日本語の業務用語に対応（2864a8c）。バックエンド `AUDIT_SEARCH_ALIASES` で内部actionへマッピング。DB上のaction値は不変。現行コードから発行されない DELETE_NOTICE / enable_user / disable_user は対応表に登録しない。
    - テスト間干渉を解消（a12268d）。検索テストが投入した秘密情報ダミー行の teardown 追加、全テストのDBガードを `nac_hub_test` 完全一致へ厳格化。
11. **手動E2E結果: PASS**（4カード表示、未接続の正直な表示、設定保存・F5維持、設定確認、有効化/無効化、監査ログ、日本語検索、390×844表示、秘密情報入力欄なし）。
12. **バージョン**: 1.8.0 に更新（backend `config.py`、frontend `SystemConfigContext.tsx` / `System.tsx`）。

### 残存未実装項目
- Slack / Google Drive / NotePM / HotBiz の実接続（OAuth / APIトークン連携）。接続状態は常に「未接続（準備段階）」。
- 認証情報（秘密情報）の安全な保管・入力機構。
- お知らせ削除・ユーザー有効化/無効化の監査ログ（現行コードでは未発行。実装時に検索対応表へ追加）。
- 各プラグインを利用する機能（チャット連携・資料検索等）。
