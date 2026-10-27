# Progress Summary

## 本ドキュメントの運用方針について (Single Source of Truth)
本ファイル `docs/nac_hub_development/progress_summary.md` をプロジェクトの進捗・サマリ管理の正本とします。プロジェクト直下に重複ファイルが存在する場合は削除し、二重管理を防止します。

## 現在のステータス
追加開発フェーズ11 完了（v1.10.0 正式確定／タグ `v1.10-nakkun-internal-data`／手動E2E PASS）

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

## 追加開発フェーズ10 進捗追記
### 現在のステータス: 追加開発フェーズ10「なっくん外部AI仮接続・デモ版」 完了（v1.9.0 正式確定・実通信E2E PASS）

1. **Provider抽象化**: `backend/app/services/ai/`（base / mock_provider / openai_provider / factory / history / instructions）。`ai_assistant.py` は Provider層経由。
2. **OpenAI Responses API**: 公式SDK（`openai==3.39.0`）。`model` / `instructions` / `input` / `max_output_tokens` / `reasoning` / `store=False` を使用（SDKシグネチャ確認済み）。外部検索・ファイル検索・ツールは不使用。
3. **設定（環境変数）**: `AI_PROVIDER`（mock既定）/ `OPENAI_API_KEY` / `OPENAI_MODEL`（既定 gpt-6-luna）/ `OPENAI_REASONING_EFFORT` / `OPENAI_TIMEOUT_SECONDS` / `OPENAI_MAX_OUTPUT_TOKENS` / `OPENAI_MAX_RETRIES`（SDKリトライ上限1）/ `AI_HISTORY_MAX_TURNS` / `AI_HISTORY_MAX_CHARS`。モデル名は設定1か所のみ。
4. **秘密情報**: APIキーはバックエンドの環境変数（`backend/.env.ai` 推奨・Git管理外・フロント非公開）だけから取得。SecretStr。ログ・レスポンス・DB・監査ログ・plugin_configs へ出さない。プラグイン管理画面の入力UIは作らない。
5. **フォールバック**: キー未設定／接続／タイムアウト／429／5xx／認証／不正レスポンス／想定外例外 → MockProviderで回答し `fallback_used=true`。画面には「外部AIへ接続できなかったため、一時的に簡易回答モードで回答しています。」。
6. **会話履歴**: 現在ユーザー本人の直近10往復・6000文字まで。秘密情報らしき値は除外してから送信。
7. **APIレスポンス**: 既存項目に mode / provider / fallback_used / warning を追加（後方互換）。`GET /api/v1/ai/status` で外部通信なしにモード判定。
8. **実行ログ**: `ai_execution_logs.process_details` に provider/model/成否/処理時間/入出力トークン数/フォールバック/エラー種別を保存（migrationなし）。モック単独は従来どおり `mock_response`。
9. **フロント**: `Chat.tsx` の注記をAPIの実モードで切替（モック／外部AI／一時的にモックへ切替）。送信中多重送信防止・履歴復元・無限ループ対策は不変。
10. **検証**: 新規 `test_ai_provider_api.py`（OpenAI実APIは呼ばない）PASS、既存全10ファイルを2回連続PASS、tsc/build/lint PASS。
11. **実通信E2E結果: PASS**（ユーザー手動確認）:
    - OpenAI API実通信成功／「外部AI回答モード」表示／自然な日本語回答。
    - 1質問につき質問1件・回答1件。
    - NotePM未接続を正直に回答／NAC HUB案件データ未接続を正直に回答。
    - F5後の会話履歴復元／「新しい会話」で履歴削除。
    - 390×844で質問・回答・スクロール・送信が正常。
    - 秘密情報非露出（APIキーのfrontend非露出・Git非追跡・dist／差分／ドキュメント／DB／実行ログに不在を確認）。
    - フォールバック動作は自動テストで確認済み。
12. **バージョン**: 1.9.0 に確定（backend `config.py`、frontend `SystemConfigContext.tsx` / `System.tsx`）。ビルド番号 20261021 は維持。
13. **テスト隔離**: `test_api.py` / `test_ai_provider_api.py` は開発環境の `.env.ai` に関わらずモック固定で実行（実OpenAI APIを呼ばない）。

### 残存未実装項目（次フェーズ以降）
> 外部AIへ接続できたことと、社内データを検索できることは別。現在のなっくんは一般的なAI回答のみで、社内データは参照しない。
- なっくんからNAC HUB案件DBを実際に検索する機能
- NotePM実API接続
- Google Drive実API接続
- Slack実API接続
- HotBiz実接続
- 社内情報横断検索
- 会社用OpenAIアカウント／Projectへの切替
- 秘密情報の管理画面／安全な保管機構
- ストリーミング回答

## 追加開発フェーズ11 進捗追記
### 現在のステータス: 追加開発フェーズ11「なっくん NAC HUB実データ検索・第1弾」 完了（v1.10.0 正式確定・手動E2E PASS）

1. **目的**: なっくんが NAC HUB 内の「案件」と「全社お知らせ」の実データを根拠に回答する。Slack / Google Drive / NotePM / HotBiz は対象外（従来どおり未接続）。
2. **安全設計**: AI に SQL / DB 権限は与えない。バックエンドが固定ルールで質問を分類 → 許可された検索関数のみ実行 → 最小限のデータを資料として OpenAI へ渡す。
3. **実装**: `backend/app/services/ai/internal_context.py`（`NacHubContextService`）。上限は案件10・お知らせ5・本文200文字・コンテキスト3000文字。秘密情報らしき値は除外。
4. **会社スコープ**: お知らせは `company_id` かつ公開中のみ。案件は `company_id` 列がないため、ダッシュボードの会社判定（プロデューサーが自社）を踏襲し、プロデューサー未設定は自社メンバーの場合のみ、他社プロデューサーの案件・所属不明の案件は対象外とした。閲覧権限は既存どおり管理者・一般で同一。
5. **Chat API**: `used_internal_data` / `references` / `context_type` を追加（既存項目不変・内部IDなし）。実行ログは `used_data=nac_hub:<種別>` と `process_details` へ追記（migrationなし）。
6. **フロント**: 「外部AI + NAC HUBデータ回答」表示、「参照：○○」チップ（案件は詳細画面へ遷移）。
7. **検証**: 新規 `test_nakkun_internal_data.py` 30項目 ALL PASS、既存＋新規11ファイルを2回連続PASS、tsc/build/lint PASS。テストは実OpenAI APIを呼ばない。
8. **手動E2E用データ**: 開発DBへ `[E2E TEST NAKKUN]` 案件3件・お知らせ3件を投入済み（削除: `docs/nakkun_internal_data/e2e_cleanup.sql`）。
9. **手動E2E結果と修正**: ほぼ全項目PASS。「要注意案件」で参照チップ2件に対し回答本文が1件のみ（AIが状態「遅延」のガンマ案件を省略）。検索結果は2件で正しかったため、資料へ「○件を省略せず全件列挙」の指示と明確な見出しを追加し、instructions にも全件列挙ルールを追記。要注意案件の定義（状態が要注意または遅延）は維持。`test_31` を追加。
10. **手動E2E結果（再確認後）: 全項目PASS**
    - 案件総数検索／要注意案件（ベータ＋ガンマを本文へ表示・参照チップ件数一致）／期限近い案件（アルファ・ベータ・ガンマを本文へ表示・件数一致）
    - 案件名検索（アルファ案件: 進捗40%・順調）／担当者（担当者名表示・メール等の内部情報非表示）
    - 最新・重要お知らせ（公開中のみ）／非公開お知らせ除外／会社スコープ
    - 参照チップ（案件・お知らせ）／外部サービス未接続回答（NotePMは未接続と正直に回答）／一般質問は「外部AI回答モード」
    - 質問1件→回答1件／F5後履歴維持／新しい会話／390×844
    - 内部ID・SQL・メール・APIキー等の非露出
11. **一覧全件列挙の修正**: 当初のE2Eで「要注意案件」の本文からガンマが欠落した点を、資料への「省略せず全件列挙」指示と instructions 追記で解消（8ad637b）。
12. **E2Eテストデータ整理**: `[E2E TEST NAKKUN]` の案件3件・メンバー5件・お知らせ3件を `e2e_cleanup.sql` で削除し、0件を確認。既存業務データ（「ああああ」」・「[E2E TEST] 監査ログ表示確認」等）は変更なし。
13. **最終検証**: 全自動テスト（既存10＋新規=11ファイル、新規は31項目）を2回連続PASS、tsc/build/lint PASS。
14. **バージョン**: 1.10.0 に確定（backend `config.py`、frontend `SystemConfigContext.tsx` / `System.tsx`）。ビルド番号 20261021 は維持。

### 残存未実装項目（次フェーズ以降）
> 内部DB検索（案件・全社お知らせ）ができることと、外部サービスを検索できることは別。現在のなっくんは案件・全社お知らせのみ参照でき、Slack / Google Drive / NotePM / HotBiz は未接続。
- `projects.company_id` 追加と既存案件所属整理
- NotePM実API接続
- Google Drive実API接続
- Slack実API接続
- HotBiz実接続
- 社内情報横断検索
- 会社用OpenAI Projectへの切替
- 秘密情報の管理画面／安全な保管機構
- ストリーミング回答
- LLM意図判定／Function Calling
- 履歴への参照元・モード保存

## 追加開発フェーズ12 進捗追記
### 現在のステータス: 追加開発フェーズ12 実装済み・NotePM実通信／参照対象選択E2E待ち（Version 1.10.0のまま・正式タグ未作成）
1. **目的**: NotePMへの読み取り専用実API接続。書き込み系（POST/PATCH/DELETE）は一切実装しない。
2. **秘密情報**: `NOTEPM_API_TOKEN` は `backend/.env.integrations`（Git除外・Docker build context除外）から backend のみが読み込む（SecretStr）。DB・plugin_configs・監査ログ・API・frontend・OpenAIへは渡さない。
3. **Client**: `app/services/notepm/`。HTTPS・`*.notepm.jp` のみ（localhost／IP／ポート／外部URL拒否）。GETのみ・タイムアウト10秒・リトライなし・リダイレクト追従なし。
4. **接続確認**: `GET /user/account` で read_flag を確認。write_flag=true なら「読み取り専用トークンの利用を推奨します」を警告表示。成功時のみ「接続済み」・最終確認日時。
5. **ホワイトリスト**: 管理者が許可ノート（最大10）を明示選択。未選択ならなっくんからのNotePM本文検索は不可。ドメイン変更で選択は解除。
6. **検索**: `GET /pages`（q / note_code / include_archived=0 / search_engine_type=v2）。1ノート5件・最終10件・本文500文字・コンテキスト3500文字が上限。
7. **なっくん連携**: 質問に明確なNotePM検索意図がある場合のみ実API検索。「外部AI + NotePMデータ回答」表示。参照チップはタイトルのみ（ページURL形式は公式で未確認のためリンクなし）。
8. **API**: `POST /admin/plugins/notepm/test-connection`、`GET /admin/plugins/notepm/notes`、`PUT /admin/plugins/notepm/allowed-notes`（管理者のみ）。
9. **検証**: `test_notepm_integration.py` 34項目 ALL PASS。既存＋新規12ファイルを2回連続PASS、tsc/build/lint PASS。

### 残存未実装項目
- ユーザー手動E2E（実接続・ノート選択・NotePM検索）
- NotePMページURLのリンク化
- Google Drive／Slack／HotBiz実API接続
- 社内情報横断検索
