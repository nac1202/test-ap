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

### /settings/users
- [ ] ユーザー一覧が実DBデータで表示される
- [ ] 氏名・メールで検索できる
- [ ] ロールフィルターで絞り込める
- [ ] ステータスフィルターで絞り込める
- [ ] 「ユーザー追加」ボタンでモーダルが開く
- [ ] ユーザー作成後、初期パスワードが表示される
- [ ] 重複メールで409エラーが日本語で表示される
- [ ] 「編集」ボタンで編集モーダルが開く
- [ ] 氏名・ロール・ステータスを更新できる
- [ ] 自分自身を無効化しようとするとエラーメッセージが表示される

### /settings/roles
- [ ] ロール一覧が実DBデータで表示される（利用者数・種別付き）
- [ ] システムロールに「システム」バッジが表示される
- [ ] 「設定」ボタンでpermissions編集モーダルが開く
- [ ] システムロールのname変更が拒否されることを確認できる（API側で拒否）

### /settings/audit
- [ ] 監査ログが新しい順に表示される
- [ ] アクションフィルターで絞り込める
- [ ] 期間フィルターで絞り込める
- [ ] キーワード検索できる
- [ ] ページネーションが機能する
- [ ] 秘密情報（パスワード等）が表示されないことを確認する

### レスポンシブ確認
- [ ] 390×844 スマートフォンで各画面が正常表示・操作できる
- [ ] 820×1180 タブレットで各画面が正常表示・操作できる
- [ ] 1440×900 PCで各画面が正常表示・操作できる
