# 追加開発フェーズ6: 管理画面API化・第1弾 実装計画

## 概要

NAC HUB内部管理機能の3画面を静的モックから実DBデータへ接続する。

対象画面:
1. `/settings/users` — ユーザー管理
2. `/settings/roles` — ロール・権限管理
3. `/settings/audit` — 監査ログ

## 実モデル確認結果

### users テーブル
| フィールド | 型 | 備考 |
|---|---|---|
| id | Integer PK | |
| company_id | Integer | 自社スコープキー |
| email | String UNIQUE | |
| password_hash | String | **APIレスポンスには含めない** |
| first_name | String | |
| last_name | String | |
| role_id | Integer | FK roles.id |
| status | String | `active` / `inactive` |
| must_change_password | Boolean | |
| created_at | DateTime | |
| updated_at | DateTime | |

### roles テーブル
| フィールド | 型 | 備考 |
|---|---|---|
| id | Integer PK | |
| name | String UNIQUE | グローバル（company_idなし） |
| permissions | JSON | `{"all": true}` 等 |

> **company_idなし**のためロールはグローバル。利用者数は自社スコープで算出。

### audit_logs テーブル
| フィールド | 型 | 備考 |
|---|---|---|
| id | Integer PK | |
| user_id | Integer | nullable（システム操作はNull） |
| action | String | |
| details | JSON | 秘密情報は除外してサマリ表示 |
| created_at | DateTime | |

> **company_id なし**のためuser_id経由で自社フィルタを実施。

## 権限構造

- `get_current_admin_user`: `role.name in ("admin", "system_admin")` で管理者判定
- システムロール: `admin`（id=1）・`user`（id=2）
- **細粒度permissionsテーブルは存在しない** → 新設せず、JSON permissionsフィールドのみ扱う

## API設計

`/api/v1/admin/` プレフィックス

### Users
| メソッド | パス | 説明 |
|---|---|---|
| GET | /admin/users | ユーザー一覧（検索・roleフィルター・statusフィルター・ページネーション） |
| GET | /admin/users/{id} | ユーザー詳細 |
| POST | /admin/users | ユーザー作成（初期パスワード自動生成・一度だけレスポンスに返す） |
| PATCH | /admin/users/{id} | ユーザー更新（名前・role・status） |

### Roles
| メソッド | パス | 説明 |
|---|---|---|
| GET | /admin/roles | ロール一覧（利用者数・is_system付き） |
| PATCH | /admin/roles/{id} | ロール更新（permissions）・systemロールのname変更は拒否 |

### Audit Logs
| メソッド | パス | 説明 |
|---|---|---|
| GET | /admin/audit-logs | 監査ログ一覧（最新順・各種フィルター） |
| GET | /admin/audit-logs/actions | actionの一覧取得（フィルタUI用） |

## 安全ガード

| ガード | 実装 |
|---|---|
| 自分自身を無効化できない | ✅ |
| 最後の有効な管理者を無効化できない | ✅ |
| 最後の管理者からadminロールを外せない | ✅ |
| 他会社ユーザーを変更できない（404で保護） | ✅ |
| システムロールのname変更不可 | ✅ |
| hashed_passwordをレスポンスに含めない | ✅ |
| audit_logsのdetailsから秘密情報を除外 | ✅ |

## 初期パスワードの扱い

- ユーザー作成時に `secrets` モジュールで12文字以上のパスワードポリシー準拠パスワードを自動生成
- 作成APIのレスポンスにのみ `initial_password` を含める（一度だけ）
- 管理者がセキュアな手段（メール/Slack等）で本人に伝達する責任を持つ
- 初回ログイン後 `must_change_password=True` によりパスワード変更が強制される
- ログには平文パスワードを記録しない

## マルチテナント

- ユーザー操作: `company_id == current_admin.company_id` で完全スコープ
- ロール: グローバル（company_idなし）だが利用者数は自社スコープで算出
- 監査ログ: 自社user_idのログのみ取得（user_id=Nullのシステムログも含む）
