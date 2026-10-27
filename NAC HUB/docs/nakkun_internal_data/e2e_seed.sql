-- 追加開発フェーズ11 手動E2E用データ（開発DB nac_hub 用）。
-- すべて "[E2E TEST NAKKUN]" で始まる名前。既存の業務データ（"[E2E TEST] 監査ログ表示確認" 等）は変更しない。
-- 適用: docker exec -i nac_hub_db psql -U postgres -d nac_hub < docs/nakkun_internal_data/e2e_seed.sql
-- 削除: docker exec -i nac_hub_db psql -U postgres -d nac_hub < docs/nakkun_internal_data/e2e_cleanup.sql
-- 前提: users.id=1（管理者）, id=2（一般ユーザー）が会社1に存在すること。
BEGIN;

WITH p AS (
  INSERT INTO projects (name, producer_id, progress_rate, deadline, status) VALUES
    ('[E2E TEST NAKKUN] アルファ案件', 1, 40, now() + interval '5 days',  'normal'),
    ('[E2E TEST NAKKUN] ベータ案件',   2, 60, now() + interval '9 days',  'warning'),
    ('[E2E TEST NAKKUN] ガンマ案件',   1, 85, now() - interval '2 days',  'delayed')
  RETURNING id, name, producer_id
)
INSERT INTO project_members (project_id, user_id, role)
SELECT id, 1, CASE WHEN producer_id = 1 THEN 'producer' ELSE 'member' END FROM p
UNION ALL
SELECT id, 2, CASE WHEN producer_id = 2 THEN 'producer' ELSE 'member' END FROM p WHERE name NOT LIKE '%ガンマ%';

INSERT INTO notices (company_id, title, body, category, is_important, is_active, created_by_id) VALUES
  (1, '[E2E TEST NAKKUN] 年末年始休業のお知らせ', '12月29日から1月3日まで全社休業です。', '全社', true,  true,  1),
  (1, '[E2E TEST NAKKUN] 社内イベントのお知らせ', '来月の社内交流会の案内です。',           '全社', false, true,  1),
  (1, '[E2E TEST NAKKUN] 非公開のお知らせ',       'この内容はなっくんに表示されてはいけません。', '全社', false, false, 1);

COMMIT;
