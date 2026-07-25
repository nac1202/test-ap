# フェーズ③ 案件管理CRUD API - タスクリスト

- [ ] 1. Pydanticスキーマ定義 (`app/schemas/project.py`)
- [ ] 2. APIルーター実装 (`app/api/routers/projects.py`)
  - [ ] 一覧取得 API (`GET /api/v1/projects`)
  - [ ] 新規作成 API (`POST /api/v1/projects`)
  - [ ] 詳細取得 API (`GET /api/v1/projects/{id}`)
  - [ ] 更新 API (`PUT /api/v1/projects/{id}`)
  - [ ] 削除 API (`DELETE /api/v1/projects/{id}`)
  - [ ] メンバー追加/削除 API (`POST/DELETE /api/v1/projects/{id}/members`)
  - [ ] タイムライン取得/投稿 API (`GET/POST /api/v1/projects/{id}/timelines`)
- [ ] 3. メインアプリ登録 (`app/main.py`)
- [ ] 4. テスト用環境構築 & 自動テスト実装 (`test_projects_api.py`)
- [ ] 5. Swagger UI および 実動作検証
