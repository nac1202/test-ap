"""
監査ログ 日本語検索 自動テスト (GET /api/v1/admin/audit-logs?search=...)

1. 「お知らせ」→ CREATE_NOTICE と UPDATE_NOTICE が取得される
2. 「お知らせ作成」→ CREATE_NOTICE のみ
3. 「お知らせ更新」→ UPDATE_NOTICE のみ
4. 「NotePM」→ NotePM関連ログ
5. 「プラグイン」→ 対応サービスのプラグインログ
6. 「システム設定」→ システム設定変更ログ（「メンテナンス」はdetailsにメンテナンス情報があるもののみ）
7. 「案件」→ 案件関連ログ
8. メールアドレス検索の維持
9. UPDATE_NOTICE 等の内部action検索の維持
10. 存在しない日本語 → 0件
11. 別会社ログが混入しない
12. 秘密情報がレスポンスに含まれない・検索対象にならない

安全ガード: テストDB (nac_hub_test) のみ使用。
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

env_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), '.env.test')),
    os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env.test')),
    '/workspace/.env.test',
    './.env.test'
]
for ep in env_paths:
    if os.path.exists(ep):
        with open(ep, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    if k.strip() == 'DATABASE_URL':
                        os.environ['DATABASE_URL'] = v.strip()
        break

from app.core.config import settings
if os.environ.get('DATABASE_URL'):
    settings.DATABASE_URL = os.environ['DATABASE_URL']

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import app.db.database as db_module

db_module.engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_module.engine)
engine = db_module.engine
SessionLocal = db_module.SessionLocal

db_name = settings.DATABASE_URL.split("/")[-1].split("?")[0]
assert db_name == "nac_hub_test", f"Safety check FAILED: refusing to run on '{db_name}'. Must use 'nac_hub_test'."
print(f"Safety check passed: using test database '{db_name}'")

from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.setting import PluginConfig
from app.models.audit import AuditLog
from app.core import security

db_module.Base.metadata.create_all(bind=engine)


def override_get_db():
    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[db_module.get_db] = override_get_db
client = TestClient(app)

ADMIN_EMAIL = "audit_search_admin@example.com"
ADMIN_PASSWORD = "AuditSearchPass123!"
COMP2_EMAIL = "audit_search_comp2@example.com"
COMP2_PASSWORD = "AuditSearchComp2Pass123!"

NOTICE_NAME = "検索テスト用お知らせ_ALPHA"
COMP2_NOTICE_NAME = "別会社お知らせ_OMEGA"
PROJECT_NAME = "検索テスト案件_BRAVO"
SECRET_VALUE = "SECRET_TOKEN_VALUE_XYZ123"

admin_token = None


def setup():
    global admin_token
    db = SessionLocal()
    try:
        for seq, tbl in (("companies_id_seq", "companies"), ("users_id_seq", "users"),
                         ("roles_id_seq", "roles"), ("plugin_configs_id_seq", "plugin_configs"),
                         ("audit_logs_id_seq", "audit_logs")):
            try:
                db.execute(text(f"SELECT setval('{seq}', (SELECT COALESCE(MAX(id), 1) FROM {tbl}));"))
                db.commit()
            except Exception:
                db.rollback()

        c1 = db.query(Company).filter(Company.name == "AuditSearchCorp1").first()
        if not c1:
            c1 = Company(name="AuditSearchCorp1", theme_color="#0066CC")
            db.add(c1)
            db.commit()
            db.refresh(c1)
        c2 = db.query(Company).filter(Company.name == "AuditSearchCorp2").first()
        if not c2:
            c2 = Company(name="AuditSearchCorp2", theme_color="#FF3300")
            db.add(c2)
            db.commit()
            db.refresh(c2)

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin", permissions={})
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        def ensure_user(email, pw, company_id):
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(email=email, password_hash=security.get_password_hash(pw),
                         company_id=company_id, role_id=admin_role.id, status="active",
                         first_name="検索", last_name="管理者", must_change_password=False)
                db.add(u)
            else:
                u.company_id = company_id
                u.role_id = admin_role.id
                u.must_change_password = False
            db.commit()
            db.refresh(u)
            return u

        u1 = ensure_user(ADMIN_EMAIL, ADMIN_PASSWORD, c1.id)
        u2 = ensure_user(COMP2_EMAIL, COMP2_PASSWORD, c2.id)

        # クリーンアップ（このテストが生成する行のみ）
        db.query(PluginConfig).filter(PluginConfig.company_id.in_([c1.id, c2.id])).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.user_id.in_([u1.id, u2.id])).delete(synchronize_session=False)
        db.commit()

        # 実際のコードと同じ形式のログを投入
        def add(uid, action, details):
            db.add(AuditLog(user_id=uid, action=action, details=details))

        add(u1.id, "CREATE_NOTICE", {"company_id": c1.id, "entity_type": "Notice", "entity_name": NOTICE_NAME,
                                     "entity_id": 1, "ip_address": "10.0.0.1", "user_agent": "UA",
                                     "category": "重要", "is_important": True})
        add(u1.id, "UPDATE_NOTICE", {"company_id": c1.id, "entity_type": "Notice", "entity_name": NOTICE_NAME,
                                     "entity_id": 1, "ip_address": "10.0.0.1", "user_agent": "UA",
                                     "updated_fields": ["title", "is_active"]})
        add(u1.id, "システム設定変更", {"summary": "メンテナンス表示: 「OFF」→「ON」", "company_name": "X",
                                       "system_name": "NAC HUB", "updated_by": ADMIN_EMAIL})
        add(u1.id, "システム設定変更", {"summary": "お知らせ表示件数: 「5件」→「7件」", "company_name": "X",
                                       "system_name": "NAC HUB", "updated_by": ADMIN_EMAIL})
        add(u1.id, "create_project", {"project_id": 99, "name": PROJECT_NAME})
        add(u1.id, "login_success", {"email": ADMIN_EMAIL})
        add(u1.id, "login_failed", {"email": ADMIN_EMAIL, "reason": "Incorrect credentials"})
        # 秘密情報を含む行（検索対象・レスポンスに出ないこと）
        add(u1.id, "update_user", {"target_email": "someone@example.com", "access_token": SECRET_VALUE,
                                   "password": SECRET_VALUE, "client_secret": SECRET_VALUE})
        # 旧形式（文字列details）
        add(u1.id, "NotePM設定変更", "NotePMの基本準備設定を更新しました。")
        # 別会社
        add(u2.id, "UPDATE_NOTICE", {"entity_name": COMP2_NOTICE_NAME, "entity_type": "Notice"})
        add(u2.id, "create_project", {"project_id": 77, "name": "別会社案件_OMEGA"})
        db.commit()
    finally:
        db.close()

    r = client.post("/api/v1/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    admin_token = r.json()["access_token"]

    # プラグイン操作は実APIで生成（NotePM / Slack）
    h = {"Authorization": f"Bearer {admin_token}"}
    assert client.put("/api/v1/admin/plugins/notepm", headers=h,
                      json={"settings": {"team_domain": "audit-search.notepm.jp"}}).status_code == 200
    assert client.post("/api/v1/admin/plugins/notepm/validate", headers=h).status_code == 200
    assert client.post("/api/v1/admin/plugins/notepm/enable", headers=h).status_code == 200
    assert client.post("/api/v1/admin/plugins/notepm/disable", headers=h).status_code == 200
    assert client.put("/api/v1/admin/plugins/slack", headers=h,
                      json={"settings": {"workspace_name": "audit-search-ws"}}).status_code == 200


def teardown():
    """このテストが投入した行(秘密情報ダミーを含む)を削除し、後続テストへ干渉させない。"""
    db = SessionLocal()
    try:
        assert db.execute(text("select current_database()")).scalar() == "nac_hub_test"
        users = db.query(User).filter(User.email.in_([ADMIN_EMAIL, COMP2_EMAIL])).all()
        uids = [u.id for u in users]
        cids = [c.id for c in db.query(Company).filter(Company.name.in_(["AuditSearchCorp1", "AuditSearchCorp2"])).all()]
        if uids:
            db.query(AuditLog).filter(AuditLog.user_id.in_(uids)).delete(synchronize_session=False)
        if cids:
            db.query(PluginConfig).filter(PluginConfig.company_id.in_(cids)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


import atexit
atexit.register(teardown)
setup()


def search(term, **extra):
    params = {"size": 100, "search": term}
    params.update(extra)
    res = client.get("/api/v1/admin/audit-logs", params=params,
                     headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200, f"{term}: {res.status_code} {res.text}"
    return res


def actions_of(res):
    return [i["action"] for i in res.json()["items"]]


def test_01_notice_all():
    a = actions_of(search("お知らせ"))
    assert "CREATE_NOTICE" in a and "UPDATE_NOTICE" in a
    print("PASS: 1. 「お知らせ」→ CREATE_NOTICE/UPDATE_NOTICE")


def test_02_notice_create_only():
    a = actions_of(search("お知らせ作成"))
    assert "CREATE_NOTICE" in a
    assert "UPDATE_NOTICE" not in a and "DELETE_NOTICE" not in a
    print("PASS: 2. 「お知らせ作成」→ CREATE_NOTICEのみ")


def test_03_notice_update_only():
    a = actions_of(search("お知らせ更新"))
    assert "UPDATE_NOTICE" in a
    assert "CREATE_NOTICE" not in a
    print("PASS: 3. 「お知らせ更新」→ UPDATE_NOTICEのみ")


def test_04_notepm():
    a = actions_of(search("NotePM"))
    for expected in ("NotePM設定変更", "NotePM設定確認", "NotePMを有効化", "NotePMを無効化"):
        assert expected in a, f"{expected} missing in {a}"
    assert not any(x.startswith("Slack") for x in a)
    # 業務用語での検索
    assert "NotePMを有効化" in actions_of(search("NotePM有効化"))
    assert "NotePMを無効化" in actions_of(search("NotePM無効化"))
    print("PASS: 4. 「NotePM」→ NotePM関連ログ（有効化/無効化の業務用語含む）")


def test_05_plugin():
    a = actions_of(search("プラグイン"))
    assert any(x.startswith("NotePM") for x in a)
    assert any(x.startswith("Slack") for x in a)
    assert "CREATE_NOTICE" not in a and "login_success" not in a
    print("PASS: 5. 「プラグイン」→ 全プラグインログ")


def test_06_system_settings():
    a = actions_of(search("システム設定"))
    assert a.count("システム設定変更") >= 2
    res = search("メンテナンス")
    items = [i for i in res.json()["items"] if i["action"] == "システム設定変更"]
    assert len(items) == 1, f"メンテナンス should match only maintenance log, got {len(items)}"
    assert "メンテナンス" in items[0]["details_summary"]
    print("PASS: 6. 「システム設定」「メンテナンス」")


def test_07_project():
    a = actions_of(search("案件"))
    assert "create_project" in a
    assert "CREATE_NOTICE" not in a
    assert "create_project" in actions_of(search("案件作成"))
    print("PASS: 7. 「案件」「案件作成」→ 案件関連ログ")


def test_08_login_and_email():
    a = actions_of(search("ログイン"))
    assert "login_success" in a and "login_failed" in a
    assert actions_of(search("ログイン成功")).count("login_failed") == 0
    assert "login_failed" in actions_of(search("ログイン失敗"))
    a2 = actions_of(search(ADMIN_EMAIL))
    assert len(a2) >= 5, "email search must keep working"
    print("PASS: 8. メールアドレス検索・ログイン系の維持")


def test_09_internal_action_and_details():
    assert "UPDATE_NOTICE" in actions_of(search("UPDATE_NOTICE"))
    assert "CREATE_NOTICE" in actions_of(search("create_notice"))  # 大文字小文字無視
    assert "CREATE_NOTICE" in actions_of(search(NOTICE_NAME))      # お知らせ名
    assert "create_project" in actions_of(search(PROJECT_NAME))    # 案件名
    assert "NotePM設定確認" in actions_of(search("チームドメイン"))  # 安全なdetails(変更内容)内文字列
    assert "CREATE_NOTICE" in actions_of(search("  お知らせ作成  "))  # 前後空白除去
    # アクションフィルター併用
    res = search("お知らせ", action="UPDATE_NOTICE")
    assert set(actions_of(res)) == {"UPDATE_NOTICE"}
    print("PASS: 9. 内部action・お知らせ名・案件名・空白除去・アクションフィルター併用")


def test_10_not_found():
    res = search("ほげふがぴよ存在しない")
    assert res.json()["total"] == 0 and res.json()["items"] == []
    print("PASS: 10. 存在しない日本語 → 0件")


def test_11_company_scope():
    for term in ("お知らせ", "案件", NOTICE_NAME, COMP2_NOTICE_NAME, "別会社", "OMEGA"):
        raw = search(term).text
        assert COMP2_NOTICE_NAME not in raw and "別会社案件_OMEGA" not in raw, f"cross-company leak via {term}"
    assert search(COMP2_NOTICE_NAME).json()["total"] == 0
    print("PASS: 11. 別会社ログが混入しない")


def test_12_no_secrets():
    # 秘密情報は検索対象にならない
    assert search(SECRET_VALUE).json()["total"] == 0
    assert search("SECRET_TOKEN").json()["total"] == 0
    raw = search("ユーザー").text + search("お知らせ").text + search("").text
    for forbidden in (SECRET_VALUE, "access_token", "client_secret", "password", "company_id",
                      "config_json", "plugin_key", "DATABASE_URL"):
        assert forbidden not in raw, f"{forbidden} leaked"
    print("PASS: 12. 秘密情報は検索対象外・レスポンスに非露出")


if __name__ == "__main__":
    test_01_notice_all()
    test_02_notice_create_only()
    test_03_notice_update_only()
    test_04_notepm()
    test_05_plugin()
    test_06_system_settings()
    test_07_project()
    test_08_login_and_email()
    test_09_internal_action_and_details()
    test_10_not_found()
    test_11_company_scope()
    test_12_no_secrets()
    print("\n==========================================")
    print("ALL AUDIT LOG JAPANESE SEARCH TESTS PASSED!")
    print("==========================================")
