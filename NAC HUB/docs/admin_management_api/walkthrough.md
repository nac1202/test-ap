# 追加開発フェーズ6: 管理画面API化・第1弾 ウォークスルー

## 実施内容

### バックエンド

#### 新規ルーター
`backend/app/api/routers/admin_management.py`

- `/api/v1/admin/users` — ユーザー管理（GET一覧・GET詳細・POST作成・PATCH更新）
- `/api/v1/admin/roles` — ロール管理（GET一覧・PATCH更新）
- `/api/v1/admin/audit-logs` — 監査ログ（GET一覧・GET actions）
- 全エンドポイント `get_current_admin_user` でガード（JWT必須 + admin/system_adminのみ）

#### main.py
`/api/v1/admin` プレフィックスでルーター登録。

### フロントエンド

#### 新規ファイル
- `frontend/src/types/admin.ts` — 管理画面TypeScript型定義
- `frontend/src/api/admin.ts` — APIクライアント（既存projects.tsパターンを踏襲）

#### 更新ファイル
- `frontend/src/pages/settings/Users.tsx` — 実API接続
- `frontend/src/pages/settings/Roles.tsx` — 実API接続
- `frontend/src/pages/settings/Audit.tsx` — 実API接続

---

## 設計上の判断・制約事項

### モデル構造上の対象外項目
| 項目 | 理由 |
|---|---|
| roles テーブルへの company_id スコープ | 既存モデルにcompany_idなし。グローバルスコープのまま扱う |
| audit_logs テーブルへの company_id直接フィルタ | 既存モデルにcompany_idなし。user_id経由で自社フィルタを実施 |
| 細粒度permission（チェックボックス式） | DBにpermissionsテーブル・role_permissionsテーブルが存在しない。JSON permissionsフィールドのみ扱う |
| ロールの削除 | 現仕様にDELETEルートなし。今後のフェーズで検討 |
| ユーザーのハードDELETE | status=inactiveで論理削除。今後のフェーズで検討 |

### 初期パスワード方式
- `secrets.SystemRandom()` + ポリシー準拠（12文字以上・大小英数字記号各1以上）の自動生成
- 作成APIレスポンスにのみ `initial_password` を含める（一度限り）
- 管理者がセキュアな手段で本人に伝達
- `must_change_password=True` で初回ログイン後の強制変更

---

## テスト結果

### 新規テスト (test_admin_management_api.py)

| # | テスト内容 | 結果 |
|---|---|---|
| 1 | 未認証 → 401 | PASS |
| 2 | 一般ユーザー → 403 | PASS |
| 3 | 管理者 → 200 | PASS |
| 4 | ユーザー一覧・自社スコープ（password_hash非露出） | PASS |
| 5 | ユーザー検索 | PASS |
| 6 | roleフィルター | PASS |
| 7 | statusフィルター | PASS |
| 8 | ユーザー作成・initial_password返却・password_hash非露出 | PASS |
| 9 | メール重複拒否 (409) | PASS |
| 10 | ユーザー詳細 | PASS |
| 11 | ユーザー更新（名前） | PASS |
| 12 | role変更 | PASS |
| 13 | ユーザー無効化・再有効化 | PASS |
| 14 | 自分自身無効化拒否 | PASS |
| 15 | 最後の管理者保護 | PASS |
| 16 | 存在しないrole拒否 | PASS |
| 17 | 他社ユーザーアクセス拒否（404） | PASS |
| 18 | ロール一覧（user_count・is_system） | PASS |
| 19 | ロール permissions更新 | PASS |
| 20 | システムロール name変更拒否 | PASS |
| 21 | 存在しないロール更新 → 404 | PASS |
| 22 | 監査ログ一覧 | PASS |
| 23 | 監査ログ 新しい順 | PASS |
| 24 | actionフィルター | PASS |
| 25 | 秘密情報非露出確認 | PASS |
| 26 | actionリスト取得 | PASS |

**全26テスト PASSED**

### 既存テスト回帰

| スイート | 件数 | 結果 |
|---|---|---|
| `test_api.py` | 21 | **ALL PASSED** |
| `test_projects_api.py` | 11 | **ALL PASSED** |
| `test_dashboard_api.py` | 4 | **ALL PASSED** |

### フロントエンド

| 項目 | 結果 |
|---|---|
| `npx tsc --noEmit` | **0 Error** |
| `npm run build` | **成功** |
| `npm run lint` | **0 Error（既知警告2件）** |

---

## 手動E2E確認項目（ユーザーによる確認）

### /settings/users ✅ PASS（390×844 確認済み）
- [x] ユーザー一覧が実DBデータで表示される
- [x] 氏名・メールで検索できる
- [x] 利用区分フィルターで絞り込める
- [x] ステータスフィルターで絞り込める
- [x] 「ユーザー追加」ボタンでモーダルが開く
- [x] ユーザー作成後、初期パスワードが表示される
- [x] 重複メールで409エラーが日本語で表示される
- [x] 「編集」ボタンで編集モーダルが開く
- [x] 氏名・利用区分・ステータスを更新できる
- [x] 自分自身を無効化しようとするとエラーメッセージが表示される

### /settings/roles ✅ PASS（390×844 確認済み）
- [x] 利用区分一覧が実DBデータで表示される（利用者数・種別付き）
- [x] 「標準の利用区分」バッジが表示される
- [x] permissions(JSON)直接編集UIが非表示
- [x] 非SE向けの「利用権限管理 / 利用区分」表記

### /settings/audit ✅ PASS（390×844 確認済み）
- [x] 監査ログが新しい順に表示される
- [x] アクションフィルターで絞り込める
- [x] 期間フィルターで絞り込める
- [x] キーワード検索できる
- [x] ページネーションが機能する
- [x] 秘密情報（パスワード等）が表示されないことを確認
- [x] 監査ログdetails日本語化正常
- [x] 内部IDの不要表示抑制正常
- [x] 案件更新ログが「進捗率：0% → 50%」「状態：正常 → 注意」と日本語表示
- [x] Python配列表現 `['...', '...']` が画面に出ない

### その他
- [x] 案件編集画面の完了予定日に既存値が表示される

---

## finalize修正（v1.5リリース前の追加整理）

### 表示名称の非SE向け統一
- 「ロール・権限管理」→「利用権限管理」
- 「ロール」→「利用区分」（Users.tsx / Roles.tsx / Audit.tsx）
- 「ロール名」→「利用区分名」（テーブルヘッダー）
- 「全ロール」→「全利用区分」（フィルタドロップダウン）
- 「システムロール」→「標準の利用区分」（バッジ）

### 監査ログ display_details 構造化対応
- バックエンド: `sanitize_details_dict()` 追加
- `AuditLogEntry.display_details` フィールド追加（後方互換性維持）
- フロントエンド: `parseLogDetails()` が `display_details`（真のJS配列）を優先使用
- `changes` 配列が正しく `formatChangeItem()` で処理され日本語化

### 案件更新ログ変更内容の日本語化
| バックエンド文字列 | 表示 |
|---|---|
| `ステータス: normal -> warning` | 状態：正常 → 注意 |
| `進捗率: 45.0% -> 75.0%` | 進捗率：45% → 75% |
| `名称: 旧名 -> 新名` | 案件名：旧名 → 新名 |
| `プロデューサーID: 1 -> 2` | 非表示（内部ID） |

### 案件編集 完了予定日修正
```diff
- setEditEndDate(project.deadline || '');
+ setEditEndDate(project.deadline ? project.deadline.split('T')[0] : '');
```
APIが返す `"2026-08-31T00:00:00"` を `input[type=date]` 用の `"2026-08-31"` に変換。

---


## 権限管理の今後の拡張方針

> **記録日**: フェーズ6実装時（2026-08-11）

### 現状

| 項目 | 状態 |
|---|---|
| ロール種類 | `admin`（システム管理者）・`user`（一般ユーザー）の2種類 |
| 権限判定方法 | `role.name in ("admin", "system_admin")` による管理者判定 |
| permissions(JSON) | DBフィールドとして存在・将来拡張用として保持中 |
| 社内向けUI | JSON直接編集なし。読み取り専用の詳細表示のみ提供 |

### 基本方針

- **社内にSE系担当者がいないため、permissionsのJSON直接編集UIは提供しない**
- `roles.permissions` フィールドはDB・APIの型として維持し、将来の権限連動に備える
- 実際の権限割り振りは、社内での運用設計が決まり次第決定する

### 将来の拡張計画（未実装）

社内で権限設計が決定した後、以下のチェック式UIへ発展させる予定：

​`
案件管理         [v] 閲覧  [v] 作成  [v] 編集  [ ] 削除
ユーザー管理     [v] 閲覧  [ ] 作成  [ ] 編集  [ ] 無効化
監査ログ         [v] 閲覧
システム設定     [ ] 閲覧  [ ] 編集
なっくん         [v] 利用
​`

#### 実装時の技術的な対応事項

1. **バックエンド**: `role.permissions` JSONをチェック項目にマッピングする権限判定ミドルウェアを追加
2. **フロントエンド**: `Roles.tsx` の `ROLE_DISPLAY` 設定オブジェクトにpermissions項目定義を追加
3. **API**: 現行の `PATCH /admin/roles/{id}` でpermissionsを更新する仕組みはすでに存在
4. **移行**: 既存の `role.name` ベース判定から `permissions` ベース判定へ段階的に移行

### 変更してはいけないこと

- `roles.permissions` フィールドをDBから削除しない
- `PATCH /admin/roles/{id}` エンドポイントを廃止しない（将来のUI用に維持）
- システムロール（admin / user）の `name` フィールドを変更しない
- 現行の `get_current_admin_user` による管理者ガードを維持する
