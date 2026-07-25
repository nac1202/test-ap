# [フェーズ③] 案件管理CRUD API 実装計画

`projects` テーブルおよび関連テーブル（`project_members`, `project_timelines`, `recent_projects`）に対するCRUD操作および関連リソース管理のための Fast API エンドポイントを実装します。

## 概要・変更対象ファイル

案件データのCRUD、進捗・ステータス管理、メンバー割り当て、タイムライン（履歴/メモ）追加、最近表示した案件（`recent_projects`）の自動トラッキング機能を実装します。

---

### Backend API (FastAPI)

#### [NEW] [project.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/schemas/project.py)
- Pydantic スキーマ定義
  - `ProjectBase`, `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`
  - `ProjectMemberCreate`, `ProjectMemberResponse`
  - `ProjectTimelineCreate`, `ProjectTimelineResponse`
  - `ProjectListResponse` (件数・ページネーション情報含む)

#### [NEW] [projects.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/projects.py)
- RESTful エンドポイントの実装
  - `GET /api/v1/projects`: 一覧取得（ステータス `normal/warning/delayed` フィルタ、プロデューサーフィルタ、キーワード検索、ページネーション）
  - `POST /api/v1/projects`: 新規作成（監査ログ出力）
  - `GET /api/v1/projects/{id}`: 詳細取得（メンバー・タイムライン含む、`recent_projects` に閲覧履歴保存）
  - `PUT /api/v1/projects/{id}`: 案件情報更新（進捗率・ステータス・期日変更等、監査ログ出力）
  - `DELETE /api/v1/projects/{id}`: 案件削除（管理者権限必須、監査ログ出力）
  - `POST /api/v1/projects/{id}/members`: メンバー追加
  - `DELETE /api/v1/projects/{id}/members/{user_id}`: メンバー削除
  - `GET /api/v1/projects/{id}/timelines`: タイムライン一覧取得
  - `POST /api/v1/projects/{id}/timelines`: タイムライン投稿

#### [MODIFY] [main.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/main.py)
- `projects.router` のインクルード (`prefix="/api/v1/projects"`, `tags=["projects"]`)

#### [NEW] [test_projects_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_projects_api.py)
- Dedicated PostgreSQL `nac_hub_test` 用の自動テストスクリプト（10項目以上の全CRUD機能検証）

---

## 検証計画 (Verification Plan)

### Automated Tests
1. **テスト専用環境での自動検証**:
   - `test_projects_api.py` を実行し、CRUD操作、権限チェック、監査ログ出力、ステータス検索等を全自動検証。

### Manual Verification
1. Dockerコンテナ環境（`docker compose`）上でのSwagger UI (`http://localhost:8000/docs`) 動作確認。
