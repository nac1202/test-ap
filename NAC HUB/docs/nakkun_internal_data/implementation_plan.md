# 追加開発フェーズ11「なっくん NAC HUB実データ検索・第1弾」実装計画（実装済み・手動E2E待ち）

正式Version: 1.9.0 のまま（Version更新・正式タグは手動E2E PASS後）。

## 1. 目的
なっくん（OpenAI実接続済み）が、NAC HUB内の **案件情報** と **全社お知らせ** の実データを根拠に回答できるようにする。
Slack / Google Drive / NotePM / HotBiz の実データ検索は対象外（従来どおり「未接続」と正直に回答）。

## 2. 最重要設計方針（AIにDB権限を与えない）
```
ユーザー質問
  ↓
NAC HUBバックエンド（認証済み current_user）
  ↓ 固定ルールで質問を分類（LLMは使わない）
安全な内部検索サービス（NacHubContextService）
  ↓ 会社スコープ・公開状態・件数/文字数上限を SQL の WHERE で適用
必要最小限のデータだけ抽出
  ↓
OpenAIへ「資料」として渡す（内部IDなし）
  ↓
なっくん回答 ＋ 参照元（references）
```
禁止事項（実装していない）: AIによるSQL生成・実行、任意SQL、全件送信、全ユーザー情報、監査ログ、password_hash、秘密情報、company_id無視の検索、他社データ。

## 3. 既存実装の監査結果
| 項目 | 監査結果 |
|---|---|
| `projects` | **`company_id` 列なし**。既存の案件一覧APIは会社で絞り込んでいない（ログイン済みなら全案件）。概要・詳細（進捗・期限・状態）、担当は `producer_id` と `project_members`。 |
| ダッシュボードの案件集計 | 「プロデューサーが自社ユーザー」または「プロデューサーが本人」の案件だけ集計（会社判定の既存ルール）。 |
| `notices` | `company_id` と `is_active`（非公開は一覧に出ない）。既存APIは自社かつ有効のみ。公開日は `created_at`。 |
| 権限 | 案件・お知らせの閲覧は、管理者／一般ユーザーで差がない（作成・更新・削除のみ管理者）。→ なっくんでも**閲覧範囲は同一**。管理者専用情報は対象に含めていない。 |
| チャット | `POST /ai/chat`、`ai_chat_histories`（user_id分離）、`ai_execution_logs`（`process_details` 文字列）。 |

### 案件の会社スコープ（本フェーズの判定ルール）
既存の案件APIは会社を絞らないため、**ダッシュボードの会社判定を踏襲し、より厳格にした**:
1. プロデューサーが自社ユーザー → 対象
2. プロデューサー未設定で、自社ユーザーがメンバーの案件 → 対象
3. 他社プロデューサーの案件は、自社ユーザーがメンバーに含まれていても**対象外**
4. プロデューサー未設定かつメンバーなし（所属が分からない案件）→ **対象外**（他社混入防止を優先）

> 注意: 開発DBの既存案件「ああああ」」「[E2E TEST] 監査ログ表示確認」はプロデューサー未設定・メンバーなしのため、なっくんの検索対象外（ダッシュボードの集計にも出ない）。
> 恒久対応（`projects.company_id` 追加など）はmigrationを伴うため次フェーズ以降。

## 4. 構成
| ファイル | 役割 |
|---|---|
| `backend/app/services/ai/internal_context.py`（新規） | `detect_intent`（質問分類）、`NacHubContextService`（get_project_summary / get_attention_projects / get_upcoming_deadlines / get_project_list / search_projects / get_project_by_name / get_project_detail / get_recent_notices / get_important_notices / search_notices / build_context）、`render_context_block` |
| `backend/app/api/routers/ai_assistant.py` | 検索の呼び出し、レスポンス拡張、実行ログ追記 |
| `backend/app/services/ai/openai_provider.py` | 内部情報ブロックを質問と同じ入力に付加（instructionsは定数のまま） |
| `backend/app/services/ai/mock_provider.py` | フォールバック時、取得済みの内部情報を回答に使用（内部情報がなければ従来どおり） |
| `backend/app/services/ai/instructions.py` | 内部情報の扱い・プロンプトインジェクション対策・未接続の正直な説明を追記 |
| `frontend/src/pages/Chat.tsx` | モード表示「外部AI + NAC HUBデータ回答」、参照チップ |
| `backend/test_nakkun_internal_data.py`（新規） | 30項目の自動テスト |

将来 Function Calling へ拡張する場合は `NacHubContextService` の各メソッドをそのままツール定義に対応させられる。

## 5. 対応する質問（固定ルールで分類）
| 質問例 | 分類 |
|---|---|
| 現在の案件は何件？／今動いている案件は何件？ | project_count |
| 要注意案件を教えて／遅延している案件は？ | project_attention（警告・遅延） |
| 期限が近い案件を教えて | project_deadline（14日以内の未完了＋期限超過の未完了） |
| 進行中の案件一覧／案件を教えて | project_list（進捗100%未満） |
| ○○案件の進捗／担当者／期限は？ | project_detail（案件名が一致） |
| ○○案件、案件名の一部 | project_search（1件なら詳細） |
| 最新のお知らせ／重要なお知らせ／○○についてのお知らせ | notice_recent / notice_important / notice_search |
| NotePM・Slack・Google Drive・HotBiz への質問 | 内部検索なし（従来どおり未接続と回答） |

「状況」「進捗」「担当」など案件語のない質問は、案件名が一致した場合のみ検索（一致しなければ一般質問）。

## 6. 取得項目と上限
- 案件: 案件名・状態・進捗率・期限・責任者（表示名）・担当メンバー（表示名）・直近タイムライン3件（80文字）。メールは取得しない。
- お知らせ: タイトル・カテゴリ・重要フラグ・公開日・本文（先頭200文字）。`is_active=false` は除外。
- 上限: 案件10件／お知らせ5件／メンバー10名／コンテキスト3000文字。LIKE記号はエスケープ。
- 文字列は `redact_secrets` を通して送信（password: … 等の値を除外）。

## 7. AIへ渡さないもの
password / password_hash / JWT / Authorization / OPENAI_API_KEY / Client Secret / トークン / DATABASE_URL / 監査ログ・IP・user_agent / config_json / company_id / 内部ID / 削除済み・非公開データ / 他社情報。

## 8. Chat API
`POST /api/v1/ai/chat` は互換維持（`id/question/answer/created_at/mode/provider/fallback_used/warning` 不変）。追加項目:
- `used_internal_data: bool`（内部検索を実行したか。該当なしでも true）
- `references: [{type: "project"|"notice", title, link?}]`（内部IDなし。`link` は案件のみ `/projects/{id}`＝既存の案件詳細画面のパス）
- `context_type: str|null`
履歴API（`GET /history`）の形式は不変（F5後は参照チップ・モード表示は復元されない）。

## 9. モード
- `AI_PROVIDER=mock`（純粋なモック）: 従来動作を維持。内部検索は行わない。
- `AI_PROVIDER=openai`: 質問に応じて内部検索→OpenAIへ資料として送信。
- OpenAI失敗（フォールバック）: 取得済みの内部情報をモック回答で提示（`mode=fallback`）。

## 10. 実行ログ（migrationなし）
`ai_execution_logs.used_data = "nac_hub:<context_type>"`（内部データなしは従来の `none`）。
`process_details` に `internal_data=true;context_type=…;ref_count=N` を追記（provider / latency / usage / fallback は既存どおり）。
取得内容・送信コンテキスト全文・SQL・秘密情報は保存しない。

## 11. 手動E2E用データ
`docs/nakkun_internal_data/e2e_seed.sql`（`[E2E TEST NAKKUN]` で始まる案件3件・お知らせ3件〈うち1件は非公開〉）を開発DBへ投入済み。
削除は `e2e_cleanup.sql`。既存の業務データ・既存の `[E2E TEST]` 案件は変更・削除しない。

## 12. 対象外（次フェーズ以降）
Slack / Google Drive / NotePM / HotBiz の実API、社内情報横断検索、会社用OpenAI切替、秘密情報の管理機構、ストリーミング回答、`projects.company_id` の追加、LLMによる意図判定／Function Calling、履歴への参照元の保存。
