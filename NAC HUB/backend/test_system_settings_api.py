"""
システム設定API 自動テスト
対象:
- GET /api/v1/admin/system-settings
- PUT /api/v1/admin/system-settings
- GET /api/v1/system-settings/public

テスト要件:
1. 未認証GET → 401
2. 管理者GET → 200
3. 一般ユーザー更新拒否 → 403
4. 管理者更新成功 → 200
5. 更新後再取得で値維持
6. 別会社設定混入なし
7. 不正入力拒否 (空文字、不正HEX、範囲外数値)
8. 監査ログ記録 (非SE向け日本語)
9. 秘密情報非露出
10. 未設定時の初期値確認
11. 公開設定エンドポイント確認

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

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import app.db.database as db_module

db_module.engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_module.engine)
engine = db_module.engine
SessionLocal = db_module.SessionLocal

# 安全ガード: テストDBのみ
db_name = settings.DATABASE_URL.split("/")[-1].split("?")[0]
print(f"Target DB URL: {settings.DATABASE_URL.replace(settings.DATABASE_URL.split('@')[0].split('//')[1], '***')}")
assert db_name == "nac_hub_test", f"Safety check FAILED: refusing to run on '{db_name}'. Must use 'nac_hub_test'."
print(f"Safety check passed: using test database '{db_name}'")

from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.setting import TenantSetting
from app.models.audit import AuditLog
from app.core import security
from app.db.seed import seed_db

# Ensure tables exist
db_module.Base.metadata.create_all(bind=engine)

def override_get_db():
    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[db_module.get_db] = override_get_db
client = TestClient(app)

ADMIN_EMAIL = settings.FIRST_SUPERUSER
ADMIN_PASSWORD = settings.FIRST_SUPERUSER_PASSWORD
NORMAL_EMAIL = "normal_settings_test@example.com"
NORMAL_PASSWORD = "NormalSettingsUser123!"
COMPANY2_ADMIN_EMAIL = "admin_comp2@example.com"
COMPANY2_PASSWORD = "AdminComp2Pass123!"


def setup_test_data():
    """テストデータの投入"""
    db = db_module.SessionLocal()
    try:
        seed_db(db)

        # 会社1の確認
        company1 = db.query(Company).filter(Company.id == 1).first()
        if not company1:
            company1 = Company(
                id=1,
                name="NAC System",
                theme_color="#FF6B00",
                timezone="Asia/Tokyo"
            )
            db.add(company1)
            db.commit()

        # 一般ユーザー (会社1)
        normal = db.query(User).filter(User.email == NORMAL_EMAIL).first()
        if not normal:
            normal = User(
                company_id=1,
                email=NORMAL_EMAIL,
                password_hash=security.get_password_hash(NORMAL_PASSWORD),
                first_name="Normal",
                last_name="User",
                role_id=2,  # user role
                status="active",
                must_change_password=False,
            )
            db.add(normal)
            db.commit()

        # 別会社 (会社2)
        company2 = db.query(Company).filter(Company.id == 2).first()
        if not company2:
            company2 = Company(
                id=2,
                name="Second Company Ltd",
                theme_color="#0066FF",
                timezone="Asia/Tokyo"
            )
            db.add(company2)
            db.commit()

        # 会社2の管理者
        admin2 = db.query(User).filter(User.email == COMPANY2_ADMIN_EMAIL).first()
        if not admin2:
            admin2 = User(
                company_id=2,
                email=COMPANY2_ADMIN_EMAIL,
                password_hash=security.get_password_hash(COMPANY2_PASSWORD),
                first_name="Admin",
                last_name="Comp2",
                role_id=1,  # admin role
                status="active",
                must_change_password=False,
            )
            db.add(admin2)
            db.commit()

    finally:
        db.close()


def get_token(email: str, pwd: str) -> str:
    res = client.post("/api/v1/auth/login", data={"username": email, "password": pwd})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def run_tests():
    print("\n--- [System Settings API Tests Starting] ---")
    setup_test_data()

    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    normal_token = get_token(NORMAL_EMAIL, NORMAL_PASSWORD)
    comp2_token = get_token(COMPANY2_ADMIN_EMAIL, COMPANY2_PASSWORD)

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    normal_headers = {"Authorization": f"Bearer {normal_token}"}
    comp2_headers = {"Authorization": f"Bearer {comp2_token}"}

    # 1. 未認証GET → 401
    print("\n1. Test Unauthenticated GET -> 401")
    r1 = client.get("/api/v1/admin/system-settings")
    assert r1.status_code == 401, f"Expected 401, got {r1.status_code}"
    print("PASS: Unauthenticated access rejected with 401")

    # 2. 管理者GET → 200
    print("\n2. Test Admin GET -> 200")
    r2 = client.get("/api/v1/admin/system-settings", headers=admin_headers)
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
    data2 = r2.json()
    assert "company_name" in data2
    assert "system_name" in data2
    assert "theme_color" in data2
    assert "timezone" in data2
    assert "notice_display_count" in data2
    assert "maintenance_mode" in data2
    assert "version_info" in data2
    print(f"PASS: Admin GET returned 200. System Name: '{data2['system_name']}', Version: '{data2['version_info']['version']}'")

    # 3. 一般ユーザー更新拒否 → 403
    print("\n3. Test Normal User PUT -> 403 Forbidden")
    payload = {
        "company_name": "Hacked Corp",
        "system_name": "Hacked Portal",
        "theme_color": "#FF0000",
        "timezone": "Asia/Tokyo",
        "notice_display_count": 10,
        "maintenance_mode": True
    }
    r3 = client.put("/api/v1/admin/system-settings", headers=normal_headers, json=payload)
    assert r3.status_code == 403, f"Expected 403, got {r3.status_code}"
    print("PASS: Normal user update rejected with 403")

    # 4. 管理者更新成功 → 200
    print("\n4. Test Admin PUT -> 200 Success")
    update_payload = {
        "company_name": "NAC株式会社",
        "system_name": "NACポータル",
        "theme_color": "#FF8800",
        "timezone": "Asia/Tokyo",
        "notice_display_count": 8,
        "maintenance_mode": True
    }
    r4 = client.put("/api/v1/admin/system-settings", headers=admin_headers, json=update_payload)
    assert r4.status_code == 200, f"Expected 200, got {r4.status_code}: {r4.text}"
    updated_data = r4.json()
    assert updated_data["company_name"] == "NAC株式会社"
    assert updated_data["system_name"] == "NACポータル"
    assert updated_data["theme_color"] == "#FF8800"
    assert updated_data["notice_display_count"] == 8
    assert updated_data["maintenance_mode"] is True
    print("PASS: Admin PUT succeeded and returned updated values")

    # 5. 更新後再取得で値維持
    print("\n5. Test Persistence on re-GET")
    r5 = client.get("/api/v1/admin/system-settings", headers=admin_headers)
    assert r5.status_code == 200
    persisted = r5.json()
    assert persisted["company_name"] == "NAC株式会社"
    assert persisted["system_name"] == "NACポータル"
    assert persisted["theme_color"] == "#FF8800"
    assert persisted["notice_display_count"] == 8
    assert persisted["maintenance_mode"] is True
    print("PASS: Re-GET confirms settings are properly persisted in DB")

    # 6. 別会社設定混入なし (マルチテナント分離)
    print("\n6. Test Multi-tenant Scope Isolation")
    r6 = client.get("/api/v1/admin/system-settings", headers=comp2_headers)
    assert r6.status_code == 200
    comp2_data = r6.json()
    # 会社2は会社1で設定した「NAC株式会社」「NACポータル」の影響を受けない
    assert comp2_data["company_name"] == "Second Company Ltd"
    assert comp2_data["system_name"] != "NACポータル"
    assert comp2_data["theme_color"] == "#0066FF"
    print("PASS: Company 2 settings are isolated from Company 1")

    # 7. 不正入力拒否 (422)
    print("\n7. Test Invalid Input Rejection (422)")
    # 7-a: 空の会社名
    bad_payload1 = {**update_payload, "company_name": "   "}
    r7a = client.put("/api/v1/admin/system-settings", headers=admin_headers, json=bad_payload1)
    assert r7a.status_code == 422, f"Expected 422 for blank company_name, got {r7a.status_code}"

    # 7-b: 不正なHEXカラーコード
    bad_payload2 = {**update_payload, "theme_color": "not-a-color"}
    r7b = client.put("/api/v1/admin/system-settings", headers=admin_headers, json=bad_payload2)
    assert r7b.status_code == 422, f"Expected 422 for invalid color, got {r7b.status_code}"

    # 7-c: 範囲外の表示件数 (0件や100件)
    bad_payload3 = {**update_payload, "notice_display_count": 0}
    r7c = client.put("/api/v1/admin/system-settings", headers=admin_headers, json=bad_payload3)
    assert r7c.status_code == 422, f"Expected 422 for notice_display_count=0, got {r7c.status_code}"
    print("PASS: All invalid inputs correctly rejected with 422")

    # 8. 監査ログ記録確認
    print("\n8. Test Audit Log Recording")
    db = db_module.SessionLocal()
    try:
        latest_audit = db.query(AuditLog).filter(
            AuditLog.action == "システム設定変更"
        ).order_by(AuditLog.created_at.desc()).first()
        assert latest_audit is not None, "Audit log for 'システム設定変更' not found"
        assert latest_audit.user_id is not None
        assert "summary" in latest_audit.details
        assert "会社名" in latest_audit.details["summary"]
        print(f"PASS: Audit log found. Action: '{latest_audit.action}', Summary: '{latest_audit.details['summary']}'")
    finally:
        db.close()

    # 9. 秘密情報非露出
    print("\n9. Test No Secrets in Response")
    sensitive_keys = ["password", "password_hash", "secret", "token", "jwt", "key"]
    for k in persisted.keys():
        assert not any(s in k.lower() for s in sensitive_keys), f"Sensitive key found in response: {k}"
    print("PASS: No sensitive keys exposed in API response")

    # 10. 未設定時の初期値確認
    print("\n10. Test Default Fallback Values")
    # 会社2のテナント設定は未登録なのでデフォルト値（システム名: NAC HUB、件数: 5件）が返る
    assert comp2_data["system_name"] == "NAC HUB"
    assert comp2_data["notice_display_count"] == 5
    assert comp2_data["maintenance_mode"] is False
    print("PASS: Default values properly provided when tenant settings not yet created")

    # 11. 公開エンドポイント確認
    print("\n11. Test Public Settings Endpoint")
    r11 = client.get("/api/v1/system-settings/public")
    assert r11.status_code == 200
    pub_data = r11.json()
    assert "company_name" in pub_data
    assert "system_name" in pub_data
    assert "theme_color" in pub_data
    assert "version_info" in pub_data
    print("PASS: Public settings endpoint returned 200 without authentication")

    print("\n=============================================")
    print("ALL 11 SYSTEM SETTINGS API TESTS PASSED! ✅")
    print("=============================================\n")


if __name__ == "__main__":
    run_tests()
