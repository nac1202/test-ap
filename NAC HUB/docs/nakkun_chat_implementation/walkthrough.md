# なっくんチャット本実装 — ウォークスルー

> 実施日: 2026-07-25

---

## 概要

NAC HUB Ver1.1 の「なっくん」AIコンシェルジュのチャット機能をモックAPI付きで本実装しました。併せて6つのドキュメントの最新化を行いました。

---

## 実施内容

### フェーズ1: ドキュメント最新化

6つのドキュメントを現在の実装状況に合わせて更新しました。

| ドキュメント | 修正内容 |
|---|---|
| `progress_summary.md` | 手動確認済み反映、フロント↔バックエンド接続状況の正確な反映、URL統一 |
| `docs/nac_hub_development/task.md` | 認証フロー手動確認済み8項目を追加 |
| `docs/system_infrastructure_setup/walkthrough.md` | Docker未インストール記載削除、パスワード実値削除→.env参照、URL統一、host.docker.internal注記 |
| `docs/docker_environment_security/walkthrough.md` | 手動確認結果テーブル追加 |
| `docs/docker_environment_security/task.md` | フェーズ3を確認済みに更新 |
| `docs/docker_environment_security/implementation_plan.md` | host.docker.internal注記追加 |

### フェーズ2: バックアップ

Git `.objects` への書き込み権限問題のため、ファイルコピーによるバックアップを実施しました。

### フェーズ3: なっくんチャット本実装

#### バックエンド（新規）

[ai_assistant.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/ai_assistant.py) — AIアシスタントAPIルーター。3つのエンドポイント:

| エンドポイント | 機能 |
|---|---|
| `POST /api/v1/ai/chat` | 質問送信 → モック回答生成 → DB保存 → レスポンス返却 |
| `GET /api/v1/ai/history` | ユーザー自身のチャット履歴取得（最新100件、時系列順） |
| `DELETE /api/v1/ai/history` | ユーザー自身のチャット履歴全消去 + 監査ログ記録 |

**セキュリティ**: JWT認証必須、`must_change_password=True` で403、秘密情報をログに記録しない、質問1〜2000文字バリデーション。

#### フロントエンド（全面リライト）

[Chat.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Chat.tsx) — 静的モックから本実装へ全面リライト:
- API接続、吹き出し表示、送信中表示、エラー+再送、Enter送信/Shift+Enter改行、F5履歴維持、「新しい会話」機能

---

## テスト結果

### 自動テスト（21項目全パス）

| # | テスト | 結果 |
|---|---|---|
| 1-12 | 既存テスト（認証・権限・パスワードポリシー） | ✅ |
| 13 | 認証なしチャット → 401 | ✅ |
| 14 | パスワード未変更チャット → 403 | ✅ |
| 15 | 認証済みチャット送信 → 200 + モック回答 | ✅ |
| 16 | DB保存確認（ai_chat_histories + ai_execution_logs） | ✅ |
| 17 | 履歴分離確認（ユーザー間の隔離） | ✅ |
| 18 | 空質問拒否 → 422 | ✅ |
| 19 | 2001文字質問拒否 → 422 | ✅ |
| 20 | ログ秘密情報チェック | ✅ |
| 21 | 履歴クリア + 空確認 | ✅ |

### ブラウザ手動確認（7項目全パス）

| # | 確認項目 | 結果 |
|---|---|---|
| 1 | ログイン → パスワード変更画面へ強制遷移 | ✅ |
| 2 | パスワード変更 → ホーム画面へ遷移 | ✅ |
| 3 | サイドバーからチャット画面へ遷移 | ✅ |
| 4 | 質問送信 → モック回答表示（案件関連の回答） | ✅ |
| 5 | 吹き出し表示（ユーザー右・なっくん左） | ✅ |
| 6 | F5後の履歴維持 | ✅ |
| 7 | ログアウト後のチャット画面アクセス拒否 | ✅ |

---

## 変更ファイル一覧

| ファイル | 操作 |
|---|---|
| `backend/app/api/routers/ai_assistant.py` | 新規作成 |
| `backend/app/main.py` | ルーター登録追加 |
| `backend/test_api.py` | テスト9項目追加 |
| `backend/alembic/versions/083bb138a0fa_*.py` | SQLite対応修正 |
| `frontend/src/pages/Chat.tsx` | 全面リライト |
| ドキュメント6ファイル | 最新化 |
