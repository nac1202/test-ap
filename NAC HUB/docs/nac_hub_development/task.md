# NAC HUB Ver1.1 開発タスクリスト

- [x] プロジェクトの初期化
  - [x] ディレクトリ構造作成 (`frontend`, `backend`, `docs`)
  - [x] `docker-compose.yml` 作成 (PostgreSQL等)
- [x] バックエンド (FastAPI) 基盤構築
  - [x] Python仮想環境構築、依存ライブラリ (`fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary` など) のインストール
  - [x] 基本的なアプリケーション構造とCORS設定
  - [x] データベース接続 (SQLAlchemy) とマイグレーション環境 (Alembic) の設定
  - [x] 大規模テーブル群の実装 (`companies`, `users`, `projects`, `ai_logs` 等15テーブル)
- [x] フロントエンド (React + Vite) 基盤構築
  - [x] Viteプロジェクト初期化
  - [x] デザイントークン (Tailwind CSS設定: オレンジ、白、淡いグレー) の設定
  - [x] 共通コンポーネント (カードUI, ボタン, ヘッダー) の作成
- [x] ログイン・権限機能の実装 (Ver1優先順位①・②)
  - [x] JWT認証エンドポイントの実装 (バックエンド)
  - [x] ログイン画面・認証状態の管理 (フロントエンド)
- [x] ホーム画面実装 (Ver1優先順位③: ウィジェット方式)
  - [x] Widget対応レイアウト基盤の構築
  - [x] 天気、予定、案件、タスク、お知らせWidgetの作成
  - [x] 各種システムへのリンク集 (HotBiz等) Widgetの実装
  - [x] 通知センターのUI実装
  - [x] 「SYSTEM MODE」表示の実装
- [x] 認証フロー実画面確認
  - [x] 初期管理者ログイン
  - [x] 初期パスワード変更画面への強制遷移
  - [x] パスワード変更 → 変更後ホーム画面表示
  - [x] F5更新後の認証維持
  - [x] ログアウト → ログアウト後の保護画面アクセス拒否
  - [x] ログイン済みユーザーの `/login` 表示防止
  - [x] 一般ユーザーの管理者API拒否（自動テスト `test_api.py` で検証済み。実画面確認は未実施）
- [x] ① AIコンシェルジュ「なっくん」のチャットUI
  - [x] チャットインターフェースコンポーネント実装（吹き出し表示、送信中表示、エラー+再送、F5維持）
  - [x] ウェルカムメッセージ + 質問サジェスト
  - 注: 外部AI API未接続、内部モック回答で動作
- [x] ② FastAPIモックAPI連携
  - [x] なっくんチャット用 FastAPI モック API 実装（POST /chat, GET /history, DELETE /history）
  - [x] フロントエンド↔バックエンド接続
  - [x] 自動テスト 21項目全パス（認証12項目 + チャット9項目）
- [x] ③ 案件管理API
  - [x] 案件データモデルとAPI実装（Pydanticスキーマ, FastAPIルーター, メンバー/タイムライン操作, 監査ログ）
  - [x] テスト用DB (`nac_hub_test`) にて自動テスト11項目全パス
- [x] ④ 案件一覧・詳細画面との接続
  - [x] 案件一覧カードUI・ステータス色分けおよび詳細画面とのAPI接続（検索・フィルタ・ページネーション・メンバー・タイムライン全接続）
  - [x] E2Eブラウザ検証全15項目パス
- [x] ⑤ 各ウィジェットの動的データ連携
  - [x] ホーム画面の各ウィジェットへの `GET /api/v1/dashboard` 集約API接続
  - [x] 未接続サービス（HotBiz予定、天気、出勤状況）の「連携準備中/未接続」明確表示
  - [x] 自動テスト & E2Eブラウザ検証20項目全パス

---

## 追加開発フェーズ（PC版基本開発12フェーズ完了後）

- [x] 追加開発フェーズ5：スマホ・タブレット対応（レスポンシブ最適化）
- [x] 追加開発フェーズ6：管理系UI・監査ログの視認性向上とAPI実装
- [x] 追加開発フェーズ7：お知らせ・通知センターAPI化 (完了: v1.6.0)
  - [x] Notice モデルおよびAPI (`/api/v1/notices`)
  - [x] Notification API (`/api/v1/notifications`)
  - [x] `Notifications.tsx` の実API化 (通知一覧・既読化)
  - [x] `Notices.tsx` の実API化 (全社お知らせ一覧)
  - [x] `Notices.tsx` 管理者用UI (お知らせ新規作成・編集モーダル) 実装
  - [x] `MockLayout.tsx` ヘッダー通知ベルの未読件数バッジ化
  - [x] `Sidebar.tsx` 通知バッジの実データ同期化
  - [x] `Home.tsx` の「重要なお知らせ」セクションをNotice連携に変更
  - [x] ユーザーによるブラウザ手動E2Eテスト確認 (すべてPASS)
- [x] 追加開発フェーズ8：システム設定API化 (完了: v1.7.0)
  - [x] 既存UI・DBモデル監査 (`System.tsx`, `Company`, `TenantSetting`)
  - [x] システム設定API実装 (`GET/PUT /api/v1/admin/system-settings`, `GET /api/v1/system-settings/public`)
  - [x] 監査ログ記録処理（非SE向け日本語変更差分）
  - [x] フロントエンド型定義・APIクライアント追加 (`types/admin.ts`, `api/admin.ts`)
  - [x] `System.tsx` の実API化・非SE日本語化・状態表示・レスポンシブ最適化
  - [x] 共通設定Context新設 (`SystemConfigContext.tsx`) によるシステム表示名の共通UI動的反映
  - [x] バージョン・ビルド番号表示の統一 (`Ver 1.7.0` / `Build 20261021`)
  - [x] お知らせ表示件数とダッシュボードAPIの連携動的化
  - [x] メンテナンス案内バナー実装 (`MaintenanceBanner.tsx`) と全共通画面・ログイン画面反映
  - [x] 新規自動テストコード作成 (`test_system_settings_api.py` 全12ケース)
  - [x] TypeScript型チェック・プロダクションビルド・Lint検証 (全PASS)
  - [x] ユーザーによるブラウザ手動E2Eテスト確認 (全項目PASS)



## 追加開発フェーズ9 タスク追記 (実装済み・手動E2E待ち)
- [x] v1.7リリースバックアップ（DB dump / ソースZIP / マニフェスト）
- [x] 既存モデル・UI監査（`plugin_configs` 既存モデルで要件充足 → migration不要）
- [x] プラグイン定義・アダプター基盤 (`app/services/plugins/`)
- [x] プラグイン管理API (`GET/PUT /admin/plugins`, `/{key}`, `/validate`, `/enable`, `/disable`)
- [x] 会社スコープ・管理者限定・秘密情報入力拒否・監査ログ
- [x] `Plugins.tsx` 実API接続（4プラグイン常時表示・設定モーダル・設定確認・有効/無効）
- [x] 新規テスト `test_plugin_management_api.py` 作成・PASS
- [x] 既存回帰テスト・tsc・build・lint PASS
- [x] ユーザーによるブラウザ手動E2E確認（PASS・v1.8.0確定）

## 追加開発フェーズ10 タスク (完了・v1.9.0)
- [x] 開始時確認（HEAD=854ef5b / v1.8タグ / Clean / 3コンテナUp / health 1.8.0）
- [x] 既存チャット実装監査（`ai_assistant.py` / `Chat.tsx` / `ai_chat_histories` / `ai_execution_logs`）
- [x] AI Provider抽象化（`app/services/ai/`: base / mock_provider / openai_provider / factory / history / instructions）
- [x] OpenAI公式SDK・Responses API実装（モデル等は環境変数で変更可）
- [x] モック回答との切替・フォールバック（未設定／接続／タイムアウト／429／5xx／不正レスポンス）
- [x] 秘密情報保護（`OPENAI_API_KEY` はバックエンド環境変数のみ・SecretStr・ログ／DB／レスポンス非露出）
- [x] 会話履歴の上限・秘密情報らしき値の除外
- [x] APIレスポンス拡張（mode / provider / fallback_used / warning）・`GET /api/v1/ai/status`
- [x] 実行ログへ provider / model / 成否 / 処理時間 / 入出力トークン数 / フォールバック / エラー種別（migrationなし）
- [x] `Chat.tsx` 回答モード表示（モック／外部AI／フォールバック）
- [x] 新規テスト `test_ai_provider_api.py`（OpenAI実APIは呼ばない）
- [x] 既存回帰テスト全10ファイルを2回連続PASS・tsc・build・lint PASS
- [x] ユーザーによるAPIキー設定・実通信E2E確認（PASS）
- [x] 秘密情報の最終確認（Git非追跡・frontend/dist/差分/docs/DB/実行ログ非露出）
- [x] Version 1.9.0 確定（config.py / SystemConfigContext.tsx / System.tsx）
- [x] 最終自動テスト全10ファイル2回連続PASS・tsc・build・lint PASS
- [x] 最終コミット・タグ `v1.9-nakkun-external-ai`
- [ ] （次フェーズ以降）案件DB検索／NotePM・Google Drive・Slack・HotBiz実接続／社内横断検索／会社用OpenAI切替／秘密情報管理機構／ストリーミング回答
