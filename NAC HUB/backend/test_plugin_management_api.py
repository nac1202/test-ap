"""
プラグイン管理API 自動テスト (追加開発フェーズ9)
対象:
- GET /api/v1/admin/plugins
- GET /api/v1/admin/plugins/{plugin_key}
- PUT /api/v1/admin/plugins/{plugin_key}
- POST /api/v1/admin/plugins/{plugin_key}/validate
- POST /api/v1/admin/plugins/{plugin_key}/enable
- POST /api/v1/admin/plugins/{plugin_key}/disable

テスト要件:
1. 未認証一覧 → 401
2. 一般ユーザー → 403
3. 管理者一覧 → 200
4. 対応4プラグインが表示 (slack, google_drive, notepm, hotbiz)
5. 会社スコープ (自社の設定のみ)
6. 別会社設定混入なし (会社Aと会社Bの設定が完全に分離)
7. 設定保存 (PUT)
8. F5相当の再取得で維持
9. 未知plugin_key拒否 (404)
10. 不正設定拒否 (400)
11. 設定不足の有効化拒否 (400)
12. 有効化 (POST /enable)
13. 無効化 (POST /disable)
14. 設定確認 (POST /validate)
15. 外部未接続を成功扱いしない (connected=False維持)
16. 秘密情報非露出
17. secret風フィールドの入力拒否 (400)
18. 監査ログ記録 (設定変更、有効化、無効化、設定確認)
19. 最終確認日時 (last_tested_at)
20. 初期状態 (DB行なしでも4プラグインがnot_configuredで返る)

安全ガード:
テストDB (nac_hub_test) を使用。
本番DB (nac_hub) は絶対に操作しない。
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

# .env.test を自動ロード
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

# 安全ガード: テストDBのみ
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

# Clean & create tables in test database
db_module.Base.metadata.create_all(bind=engine)

def override_get_db():
    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[db_module.get_db] = override_get_db
client = TestClient(app)

ADMIN_EMAIL = "admin_plugin_test@example.com"
ADMIN_PASSWORD = "AdminPluginPass123!"
NORMAL_EMAIL = "normal_plugin_test@example.com"
NORMAL_PASSWORD = "NormalPluginPass123!"
COMPANY2_ADMIN_EMAIL = "comp2_admin_plugin@example.com"
COMPANY2_PASSWORD = "Comp2PluginPass123!"

admin_token = None
normal_token = None
comp2_token = None
comp1_id = None
comp2_id = None

def setup_test_data():
    global admin_token, normal_token, comp2_token, comp1_id, comp2_id
    db = SessionLocal()
    try:
        # PostgreSQLシーケンスの同期
        try:
            db.execute(text("SELECT setval('companies_id_seq', (SELECT COALESCE(MAX(id), 1) FROM companies));"))
            db.execute(text("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));"))
            db.execute(text("SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));"))
            db.execute(text("SELECT setval('plugin_configs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM plugin_configs));"))
            db.commit()
        except Exception:
            db.rollback()

        # 既存テストデータクリーンアップ
        db.query(PluginConfig).delete()
        db.query(AuditLog).filter(AuditLog.action.like('%Slack%')).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.action.like('%Google%')).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.action.like('%NotePM%')).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.action.like('%HotBiz%')).delete(synchronize_session=False)
        db.commit()

        # 会社1
        c1 = db.query(Company).filter(Company.name == "PluginTestCorp1").first()
        if not c1:
            c1 = Company(name="PluginTestCorp1", theme_color="#0066CC")
            db.add(c1)
            db.commit()
            db.refresh(c1)
        comp1_id = c1.id

        # 会社2 (マルチテナント検証用)
        c2 = db.query(Company).filter(Company.name == "PluginTestCorp2").first()
        if not c2:
            c2 = Company(name="PluginTestCorp2", theme_color="#FF3300")
            db.add(c2)
            db.commit()
            db.refresh(c2)
        comp2_id = c2.id

        # 管理者ロール & 一般ロール
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin", permissions={})
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        normal_role = db.query(Role).filter(Role.name == "normal").first()
        if not normal_role:
            normal_role = Role(name="normal", permissions={})
            db.add(normal_role)
            db.commit()
            db.refresh(normal_role)

        # 会社1 管理者
        u_admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not u_admin:
            u_admin = User(
                email=ADMIN_EMAIL,
                password_hash=security.get_password_hash(ADMIN_PASSWORD),
                company_id=comp1_id,
                role_id=admin_role.id,
                status="active",
                must_change_password=False
            )
            db.add(u_admin)
        else:
            u_admin.company_id = comp1_id
            u_admin.role_id = admin_role.id
            u_admin.must_change_password = False

        # 会社1 一般ユーザー
        u_normal = db.query(User).filter(User.email == NORMAL_EMAIL).first()
        if not u_normal:
            u_normal = User(
                email=NORMAL_EMAIL,
                password_hash=security.get_password_hash(NORMAL_PASSWORD),
                company_id=comp1_id,
                role_id=normal_role.id,
                status="active",
                must_change_password=False
            )
            db.add(u_normal)
        else:
            u_normal.company_id = comp1_id
            u_normal.role_id = normal_role.id
            u_normal.must_change_password = False

        # 会社2 管理者
        u_comp2 = db.query(User).filter(User.email == COMPANY2_ADMIN_EMAIL).first()
        if not u_comp2:
            u_comp2 = User(
                email=COMPANY2_ADMIN_EMAIL,
                password_hash=security.get_password_hash(COMPANY2_PASSWORD),
                company_id=comp2_id,
                role_id=admin_role.id,
                status="active",
                must_change_password=False
            )
            db.add(u_comp2)
        else:
            u_comp2.company_id = comp2_id
            u_comp2.role_id = admin_role.id
            u_comp2.must_change_password = False

        db.commit()
    finally:
        db.close()

    # ログインしてトークン取得
    r = client.post("/api/v1/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]

    r = client.post("/api/v1/auth/login", data={"username": NORMAL_EMAIL, "password": NORMAL_PASSWORD})
    assert r.status_code == 200, f"Normal login failed: {r.text}"
    normal_token = r.json()["access_token"]

    r = client.post("/api/v1/auth/login", data={"username": COMPANY2_ADMIN_EMAIL, "password": COMPANY2_PASSWORD})
    assert r.status_code == 200, f"Comp2 login failed: {r.text}"
    comp2_token = r.json()["access_token"]

setup_test_data()

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

# ──────────────────────────────────────────────────────────
# 1. 未認証一覧 → 401
# ──────────────────────────────────────────────────────────
def test_01_unauthorized_list():
    res = client.get("/api/v1/admin/plugins")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("PASS: 1. 未認証一覧 → 401")

# ──────────────────────────────────────────────────────────
# 2. 一般ユーザー → 403
# ──────────────────────────────────────────────────────────
def test_02_forbidden_normal_user():
    res = client.get("/api/v1/admin/plugins", headers=auth_headers(normal_token))
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    assert "detail" in res.json()
    print("PASS: 2. 一般ユーザー → 403")

# ──────────────────────────────────────────────────────────
# 3. 管理者一覧 → 200
# 4. 対応4プラグインが表示 (slack, google_drive, notepm, hotbiz)
# 5. 初期状態 (not_configured, is_enabled=False, connected=False)
# ──────────────────────────────────────────────────────────
def test_03_admin_list_initial():
    res = client.get("/api/v1/admin/plugins", headers=auth_headers(admin_token))
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["total"] == 4
    items = data["items"]
    keys = [item["plugin_key"] for item in items]
    assert keys == ["slack", "google_drive", "notepm", "hotbiz"]
    
    for item in items:
        assert item["is_enabled"] is False
        assert item["status"] == "not_configured"
        assert item["connected"] is False  # 実通信未実装のため必ずFalse
        assert item["settings"] == {}
        assert item["last_tested_at"] is None
        assert item["last_validation_result"] is None
    print("PASS: 3, 4, 5. 管理者一覧取得・4プラグイン完全表示・初期状態確認")

# ──────────────────────────────────────────────────────────
# 6. 未知plugin_key拒否 (404)
# ──────────────────────────────────────────────────────────
def test_06_unknown_plugin_key():
    res = client.get("/api/v1/admin/plugins/unknown_service", headers=auth_headers(admin_token))
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    
    res = client.put(
        "/api/v1/admin/plugins/unknown_service",
        headers=auth_headers(admin_token),
        json={"settings": {"foo": "bar"}}
    )
    assert res.status_code == 404
    print("PASS: 6. 未知plugin_key拒否 (404)")

# ──────────────────────────────────────────────────────────
# 7. 設定保存 (PUT) & 8. 再取得で値維持 (F5相当)
# ──────────────────────────────────────────────────────────
def test_07_08_save_and_fetch_slack():
    slack_settings = {
        "workspace_name": "nac-test-workspace.slack.com",
        "target_channel": "#general, #dev-alerts",
        "connect_intent": True
    }
    res = client.put(
        "/api/v1/admin/plugins/slack",
        headers=auth_headers(admin_token),
        json={"settings": slack_settings}
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["plugin_key"] == "slack"
    assert data["settings"]["workspace_name"] == "nac-test-workspace.slack.com"
    assert data["is_enabled"] is False  # 有効化はまだ行っていない
    assert data["status"] == "disabled"  # 無効状態

    # GET /slack で再取得確認 (F5維持確認)
    res_get = client.get("/api/v1/admin/plugins/slack", headers=auth_headers(admin_token))
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["settings"]["workspace_name"] == "nac-test-workspace.slack.com"
    assert get_data["settings"]["target_channel"] == "#general, #dev-alerts"
    print("PASS: 7, 8. 設定保存と再取得での値維持 (F5相当)")

# ──────────────────────────────────────────────────────────
# 9. secret風フィールドの入力拒否 (400)
# ──────────────────────────────────────────────────────────
def test_09_secret_field_rejected():
    forbidden_payloads = [
        {"client_secret": "forbidden_secret_value"},
        {"api_token": "xoxb-1234567890"},
        {"password": "mypassword"},
        {"private_key": "---BEGIN RSA PRIVATE KEY---"},
        {"auth_token": "some-token"}
    ]
    for bad_s in forbidden_payloads:
        res = client.put(
            "/api/v1/admin/plugins/slack",
            headers=auth_headers(admin_token),
            json={"settings": bad_s}
        )
        assert res.status_code == 400, f"Expected 400 for {bad_s}, got {res.status_code}"
        assert "機密情報" in res.text or "資格情報" in res.text
    print("PASS: 9. secret風フィールドの入力拒否 (400)")

# ──────────────────────────────────────────────────────────
# 10. プラグイン固有の不正設定拒否 (400)
# ──────────────────────────────────────────────────────────
def test_10_invalid_plugin_settings():
    # HotBiz の不正な連携方式
    res = client.put(
        "/api/v1/admin/plugins/hotbiz",
        headers=auth_headers(admin_token),
        json={"settings": {"connection_method": "invalid_hack_method"}}
    )
    assert res.status_code == 400
    assert "不正な連携方式" in res.text
    print("PASS: 10. プラグイン固有の不正設定拒否 (400)")

# ──────────────────────────────────────────────────────────
# 11. 設定不足の有効化拒否 (400)
# ──────────────────────────────────────────────────────────
def test_11_enable_without_settings_rejected():
    # google_drive はまだ未設定
    res = client.post("/api/v1/admin/plugins/google_drive/enable", headers=auth_headers(admin_token))
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "設定が不足しているため有効化できません" in res.text
    print("PASS: 11. 設定不足の有効化拒否 (400)")

# ──────────────────────────────────────────────────────────
# 12. 有効化成功 (POST /enable)
# ──────────────────────────────────────────────────────────
def test_12_enable_plugin_success():
    # slack は test_07 で設定済み
    res = client.post("/api/v1/admin/plugins/slack/enable", headers=auth_headers(admin_token))
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["is_enabled"] is True
    # 有効化後は「認証情報の準備が必要」(needs_credentials)
    assert data["status"] == "needs_credentials"
    assert data["status_label"] == "認証情報の準備が必要"
    assert data["connected"] is False  # 外部未接続
    print("PASS: 12. 有効化成功 (is_enabled=True, status=needs_credentials)")

# ──────────────────────────────────────────────────────────
# 13. 無効化成功 (POST /disable)
# ──────────────────────────────────────────────────────────
def test_13_disable_plugin_success():
    res = client.post("/api/v1/admin/plugins/slack/disable", headers=auth_headers(admin_token))
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["is_enabled"] is False
    assert data["status"] == "disabled"
    assert data["status_label"] == "無効"
    print("PASS: 13. 無効化成功 (is_enabled=False, status=disabled)")

# ──────────────────────────────────────────────────────────
# 14. 設定確認 (POST /validate) & 15. 外部未接続を正直に案内
# ──────────────────────────────────────────────────────────
def test_14_15_validate_plugin():
    res = client.post("/api/v1/admin/plugins/slack/validate", headers=auth_headers(admin_token))
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "needs_credentials"
    # 正直なメッセージ検証（本接続にはOAuthが必要、現フェーズでは未接続）
    assert "Slack OAuth認証" in data["message"]
    assert "現フェーズでは未接続" in data["message"]
    assert data["tested_at"] is not None

    # プラグイン詳細にも最終確認情報が反映されているか
    res_plugin = client.get("/api/v1/admin/plugins/slack", headers=auth_headers(admin_token))
    p_data = res_plugin.json()
    assert p_data["last_tested_at"] is not None
    assert p_data["last_validation_result"] == data["message"]
    assert p_data["connected"] is False
    print("PASS: 14, 15. 設定確認の実行と正直な案内メッセージ・最終確認日時の反映")

# ──────────────────────────────────────────────────────────
# 16. 会社スコープ・別会社設定混入なし
# ──────────────────────────────────────────────────────────
def test_16_company_scope_isolation():
    # 会社2 の管理者が一覧取得
    res_c2 = client.get("/api/v1/admin/plugins", headers=auth_headers(comp2_token))
    assert res_c2.status_code == 200
    c2_items = res_c2.json()["items"]
    c2_slack = next(item for item in c2_items if item["plugin_key"] == "slack")
    
    # 会社2側では Slack は未設定の初期状態のままであること
    assert c2_slack["settings"] == {}
    assert c2_slack["is_enabled"] is False
    assert c2_slack["status"] == "not_configured"

    # 会社2で Google Drive を設定保存
    res_c2_put = client.put(
        "/api/v1/admin/plugins/google_drive",
        headers=auth_headers(comp2_token),
        json={"settings": {"drive_name": "Company2 Shared Drive"}}
    )
    assert res_c2_put.status_code == 200

    # 会社1側には影響がないこと
    res_c1_gd = client.get("/api/v1/admin/plugins/google_drive", headers=auth_headers(admin_token))
    c1_gd_data = res_c1_gd.json()
    assert c1_gd_data["settings"] == {}
    assert c1_gd_data["is_enabled"] is False
    print("PASS: 16. 会社スコープの完全分離 (別会社設定混入なし)")

# ──────────────────────────────────────────────────────────
# 17. 監査ログ記録確認 (設定変更、有効化、無効化、設定確認)
# ──────────────────────────────────────────────────────────
def test_17_audit_log_recorded():
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).filter(AuditLog.action.like('%Slack%')).all()
        actions = [l.action for l in logs]
        assert "Slack設定変更" in actions
        assert "Slackを有効化" in actions
        assert "Slackを無効化" in actions
        assert "Slack設定確認" in actions
        
        # 秘密情報が含まれていないことの検証
        for l in logs:
            assert "client_secret" not in (l.details or "")
            assert "token" not in (l.details or "")
    finally:
        db.close()
    print("PASS: 17. 監査ログ記録確認 (平易な日本語アクション・秘密情報非露出)")

# ──────────────────────────────────────────────────────────
# 18. HotBiz 連携方式の設定確認 (link, gcal, csv, vendor)
# ──────────────────────────────────────────────────────────
def test_18_hotbiz_all_methods():
    methods = [
        ("link", "ポータルリンク方式"),
        ("gcal", "Googleカレンダー経由"),
        ("csv", "CSV取込連携"),
        ("vendor", "ベンダー個別連携方式")
    ]
    for method, expected_text in methods:
        res = client.put(
            "/api/v1/admin/plugins/hotbiz",
            headers=auth_headers(admin_token),
            json={"settings": {
                "version": "HotBiz 7",
                "connection_method": method,
                "target_features": ["schedule", "attendance"]
            }}
        )
        assert res.status_code == 200
        
        # 設定確認
        res_v = client.post("/api/v1/admin/plugins/hotbiz/validate", headers=auth_headers(admin_token))
        assert res_v.status_code == 200
        assert expected_text in res_v.json()["message"]
    print("PASS: 18. HotBiz 全連携方式の設定保存および設定確認メッセージ検証")

# ──────────────────────────────────────────────────────────
# 19. NotePM & Google Drive 設定・有効化検証
# ──────────────────────────────────────────────────────────
def test_19_notepm_and_google_drive():
    # NotePM 設定
    res_npm = client.put(
        "/api/v1/admin/plugins/notepm",
        headers=auth_headers(admin_token),
        json={"settings": {"team_domain": "nac-test.notepm.jp", "read_only": True}}
    )
    assert res_npm.status_code == 200
    
    # NotePM 有効化
    res_npm_en = client.post("/api/v1/admin/plugins/notepm/enable", headers=auth_headers(admin_token))
    assert res_npm_en.status_code == 200
    assert res_npm_en.json()["is_enabled"] is True

    # Google Drive 設定 & 有効化
    res_gd = client.put(
        "/api/v1/admin/plugins/google_drive",
        headers=auth_headers(admin_token),
        json={"settings": {"drive_name": "NAC 全社資料", "target_folder": "01_共有資料"}}
    )
    assert res_gd.status_code == 200

    res_gd_en = client.post("/api/v1/admin/plugins/google_drive/enable", headers=auth_headers(admin_token))
    assert res_gd_en.status_code == 200
    assert res_gd_en.json()["is_enabled"] is True
    print("PASS: 19. NotePM & Google Drive の設定保存および有効化検証")

# ──────────────────────────────────────────────────────────
# 20. 秘密情報非露出の最終確認
# ──────────────────────────────────────────────────────────
def test_20_no_secrets_exposed():
    res = client.get("/api/v1/admin/plugins", headers=auth_headers(admin_token))
    assert res.status_code == 200
    raw_text = res.text
    forbidden_tokens = ["secret", "password", "token", "DATABASE_URL"]
    for t in forbidden_tokens:
        assert f'"{t}"' not in raw_text.lower()
    print("PASS: 20. 秘密情報非露出の最終確認")

if __name__ == "__main__":
    test_01_unauthorized_list()
    test_02_forbidden_normal_user()
    test_03_admin_list_initial()
    test_06_unknown_plugin_key()
    test_07_08_save_and_fetch_slack()
    test_09_secret_field_rejected()
    test_10_invalid_plugin_settings()
    test_11_enable_without_settings_rejected()
    test_12_enable_plugin_success()
    test_13_disable_plugin_success()
    test_14_15_validate_plugin()
    test_16_company_scope_isolation()
    test_17_audit_log_recorded()
    test_18_hotbiz_all_methods()
    test_19_notepm_and_google_drive()
    test_20_no_secrets_exposed()
    print("\n==========================================")
    print("ALL 20+ PLUGIN MANAGEMENT API TESTS PASSED!")
    print("==========================================")
