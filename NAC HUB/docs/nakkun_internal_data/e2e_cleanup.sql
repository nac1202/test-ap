-- 追加開発フェーズ11 手動E2E用データの削除（"[E2E TEST NAKKUN]" で始まるものだけ）。
-- 既存の "[E2E TEST] 監査ログ表示確認" などは対象外。
BEGIN;

DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[E2E TEST NAKKUN]%');
DELETE FROM project_timelines WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[E2E TEST NAKKUN]%');
DELETE FROM recent_projects WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '[E2E TEST NAKKUN]%');
DELETE FROM projects WHERE name LIKE '[E2E TEST NAKKUN]%';
DELETE FROM notices WHERE title LIKE '[E2E TEST NAKKUN]%';

COMMIT;
