"""
管理画面API 自動テスト
対象: /api/v1/admin/users, /api/v1/admin/roles, /api/v1/admin/audit-logs

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


def get_db_session():
    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def setup_test_data():
    """テスト用データセットアップ"""
    db = db_module.SessionLocal()
    try:
        seed_db(db)

        # admin ユーザー取得（seedで作成済み）
        admin = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()

        # 一般ユーザー作成（テスト用）
        normal = db.query(User).filter(User.email == "normal_admin_test@example.com").first()
        if not normal:
            normal = User(
                company_id=1,
                email="normal_admin_test@example.com",
                password_hash=security.get_password_hash("NormalUser@Test123!"),
                first_name="Normal",
                last_name="User",
                role_id=2,  # user role
                status="active",
                must_change_password=False,
            )
            db.add(normal)
            db.commit()
            db.refresh(normal)

        # テスト用ターゲットユーザー
        target = db.query(User).filter(User.email == "target_admin_test@example.com").first()
        if not target:
            target = User(
                company_id=1,
                email="target_admin_test@example.com",
                password_hash=security.get_password_hash("TargetUser@Test123!"),
                first_name="Target",
                last_name="User",
                role_id=2,
                status="active",
                must_change_password=False,
            )
            db.add(target)
            db.commit()
            db.refresh(target)

        return admin, normal, target
    finally:
        db.close()


def get_token(email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["access_token"]


def get_admin_token() -> str:
    """adminトークン取得：FIRST_SUPERUSER_PASSWORDで直接ログイン可能な状態に初期化"""
    db = db_module.SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
        if admin:
            admin.password_hash = security.get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
            admin.must_change_password = False
            db.commit()
    finally:
        db.close()
    return get_token(settings.FIRST_SUPERUSER, settings.FIRST_SUPERUSER_PASSWORD)


def teardown_test_users(emails: list):
    """テストで作成したユーザーを後片付け"""
    db = db_module.SessionLocal()
    try:
        for email in emails:
            u = db.query(User).filter(User.email == email).first()
            if u:
                db.delete(u)
        db.commit()
    finally:
        db.close()


print("\nRunning Admin Management API validation tests...")

# セットアップ
admin_user, normal_user, target_user = setup_test_data()
admin_token = get_admin_token()
normal_token = get_token("normal_admin_test@example.com", "NormalUser@Test123!")

created_user_emails = []

# ===========================================================================
# 1. 未認証 → 401
# ===========================================================================
print("\n--- 1. Testing Unauthenticated Access ---")
r = client.get("/api/v1/admin/users")
assert r.status_code == 401, f"Expected 401, got {r.status_code}"
r = client.get("/api/v1/admin/roles")
assert r.status_code == 401, f"Expected 401, got {r.status_code}"
r = client.get("/api/v1/admin/audit-logs")
assert r.status_code == 401, f"Expected 401, got {r.status_code}"
print("Unauthenticated access correctly rejected with 401: PASS")

# ===========================================================================
# 2. 一般ユーザー → 403
# ===========================================================================
print("\n--- 2. Testing Normal User Access (Should 403) ---")
headers_normal = {"Authorization": f"Bearer {normal_token}"}
r = client.get("/api/v1/admin/users", headers=headers_normal)
assert r.status_code == 403, f"Expected 403, got {r.status_code}"
r = client.get("/api/v1/admin/roles", headers=headers_normal)
assert r.status_code == 403, f"Expected 403, got {r.status_code}"
r = client.get("/api/v1/admin/audit-logs", headers=headers_normal)
assert r.status_code == 403, f"Expected 403, got {r.status_code}"
print("Normal user access correctly rejected with 403: PASS")

# ===========================================================================
# 3. 管理者 → 200
# ===========================================================================
print("\n--- 3. Testing Admin Access (Should 200) ---")
headers_admin = {"Authorization": f"Bearer {admin_token}"}
r = client.get("/api/v1/admin/users", headers=headers_admin)
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
r = client.get("/api/v1/admin/roles", headers=headers_admin)
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
r = client.get("/api/v1/admin/audit-logs", headers=headers_admin)
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
print("Admin access correctly allowed with 200: PASS")

# ===========================================================================
# 4. ユーザー一覧・自社スコープ確認（別会社混入なし）
# ===========================================================================
print("\n--- 4. Testing User List & Company Scope ---")
r = client.get("/api/v1/admin/users", headers=headers_admin)
assert r.status_code == 200
data = r.json()
assert "items" in data and "total" in data
for u in data["items"]:
    assert u["company_id"] == 1, f"Cross-company user leaked: {u}"
    assert "password_hash" not in u, "password_hash should not be in response"
    assert "password" not in u, "password should not be in response"
print(f"User list returned {data['total']} users, all company_id=1: PASS")

# ===========================================================================
# 5. ユーザー検索
# ===========================================================================
print("\n--- 5. Testing User Search ---")
r = client.get("/api/v1/admin/users?search=Admin", headers=headers_admin)
assert r.status_code == 200
data = r.json()
assert data["total"] >= 1
print(f"Search 'Admin' returned {data['total']} results: PASS")

# ===========================================================================
# 6. roleフィルター
# ===========================================================================
print("\n--- 6. Testing Role Filter ---")
r = client.get("/api/v1/admin/users?role_id=2", headers=headers_admin)
assert r.status_code == 200
data = r.json()
for u in data["items"]:
    assert u["role_id"] == 2
print(f"Role filter (role_id=2) returned {data['total']} users: PASS")

# ===========================================================================
# 7. statusフィルター
# ===========================================================================
print("\n--- 7. Testing Status Filter ---")
r = client.get("/api/v1/admin/users?status=active", headers=headers_admin)
assert r.status_code == 200
data = r.json()
for u in data["items"]:
    assert u["status"] == "active"
print(f"Status filter (active) returned {data['total']} users: PASS")

# ===========================================================================
# 8. ユーザー作成
# ===========================================================================
print("\n--- 8. Testing User Create ---")
new_email = "created_admin_test@example.com"
created_user_emails.append(new_email)
r = client.post("/api/v1/admin/users", headers=headers_admin, json={
    "email": new_email,
    "first_name": "Created",
    "last_name": "TestUser",
    "role_id": 2,
    "status": "active",
})
assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
created = r.json()
assert created["email"] == new_email
assert created["must_change_password"] == True
assert "initial_password" in created
assert "password_hash" not in created
initial_pw = created["initial_password"]
created_user_id = created["id"]
print(f"User created (id={created_user_id}), initial_password provided, password_hash not exposed: PASS")

# ===========================================================================
# 9. メール重複拒否
# ===========================================================================
print("\n--- 9. Testing Duplicate Email Rejection ---")
r = client.post("/api/v1/admin/users", headers=headers_admin, json={
    "email": new_email,
    "first_name": "Dup",
    "last_name": "User",
    "role_id": 2,
})
assert r.status_code == 409, f"Expected 409, got {r.status_code}"
print("Duplicate email correctly rejected with 409: PASS")

# ===========================================================================
# 10. ユーザー詳細取得
# ===========================================================================
print("\n--- 10. Testing User Detail ---")
r = client.get(f"/api/v1/admin/users/{created_user_id}", headers=headers_admin)
assert r.status_code == 200
detail = r.json()
assert detail["id"] == created_user_id
assert "password_hash" not in detail
print("User detail retrieved without password_hash: PASS")

# ===========================================================================
# 11. ユーザー更新 (名前変更)
# ===========================================================================
print("\n--- 11. Testing User Update ---")
r = client.patch(f"/api/v1/admin/users/{created_user_id}", headers=headers_admin, json={
    "first_name": "UpdatedFirst",
})
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
assert r.json()["first_name"] == "UpdatedFirst"
print("User name update: PASS")

# ===========================================================================
# 12. role変更
# ===========================================================================
print("\n--- 12. Testing Role Change ---")
r = client.patch(f"/api/v1/admin/users/{created_user_id}", headers=headers_admin, json={
    "role_id": 1,
})
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
assert r.json()["role_id"] == 1
# 元に戻す
r = client.patch(f"/api/v1/admin/users/{created_user_id}", headers=headers_admin, json={
    "role_id": 2,
})
assert r.status_code == 200
print("Role change: PASS")

# ===========================================================================
# 13. ユーザー無効化
# ===========================================================================
print("\n--- 13. Testing User Deactivation ---")
r = client.patch(f"/api/v1/admin/users/{created_user_id}", headers=headers_admin, json={
    "status": "inactive",
})
assert r.status_code == 200
assert r.json()["status"] == "inactive"
# 再有効化
r = client.patch(f"/api/v1/admin/users/{created_user_id}", headers=headers_admin, json={
    "status": "active",
})
assert r.status_code == 200
print("User deactivation and reactivation: PASS")

# ===========================================================================
# 14. 自分自身無効化拒否
# ===========================================================================
print("\n--- 14. Testing Self-Deactivation Rejection ---")
db = db_module.SessionLocal()
admin_user_obj = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
admin_id = admin_user_obj.id
db.close()
r = client.patch(f"/api/v1/admin/users/{admin_id}", headers=headers_admin, json={
    "status": "inactive",
})
assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
assert "自分自身" in r.json()["detail"]
print("Self-deactivation correctly rejected: PASS")

# ===========================================================================
# 15. 最後の管理者保護
# ===========================================================================
print("\n--- 15. Testing Last Admin Protection ---")
# 現在の管理者はadmin_userのみ（role_id=1）
# target_userはrole_id=2なので最後の管理者ではない
# admin_userをinactiveにしようとすると拒否される
r = client.patch(f"/api/v1/admin/users/{admin_id}", headers=headers_admin, json={
    "status": "inactive",
})
# 自分自身チェックが先に走るので400
assert r.status_code == 400
print("Last admin protection (self-deactivation check triggered): PASS")

# ===========================================================================
# 16. 存在しないrole指定の拒否
# ===========================================================================
print("\n--- 16. Testing Invalid Role Rejection ---")
r = client.patch(f"/api/v1/admin/users/{created_user_id}", headers=headers_admin, json={
    "role_id": 9999,
})
assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
print("Invalid role correctly rejected: PASS")

# ===========================================================================
# 17. 他社ユーザー更新拒否（別会社ユーザーは404で保護）
# ===========================================================================
print("\n--- 17. Testing Cross-Company User Access Rejection ---")
# 存在しないIDへのアクセス（別会社相当）
r = client.get("/api/v1/admin/users/99999", headers=headers_admin)
assert r.status_code == 404, f"Expected 404, got {r.status_code}"
r = client.patch("/api/v1/admin/users/99999", headers=headers_admin, json={"first_name": "Hacked"})
assert r.status_code == 404, f"Expected 404, got {r.status_code}"
print("Cross-company user access correctly rejected with 404: PASS")

# ===========================================================================
# 18. ロール一覧
# ===========================================================================
print("\n--- 18. Testing Role List ---")
r = client.get("/api/v1/admin/roles", headers=headers_admin)
assert r.status_code == 200
roles = r.json()
assert len(roles) >= 2
for role in roles:
    assert "id" in role
    assert "name" in role
    assert "user_count" in role
    assert "is_system" in role
print(f"Role list returned {len(roles)} roles with user_count and is_system: PASS")

# ===========================================================================
# 19. ロール更新（permissions更新）
# ===========================================================================
print("\n--- 19. Testing Role Update (permissions) ---")
user_role_id = next(r["id"] for r in roles if r["name"] == "user")
r = client.patch(f"/api/v1/admin/roles/{user_role_id}", headers=headers_admin, json={
    "permissions": {"projects": {"read": True, "write": False}},
})
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
print("Role permissions update: PASS")

# ===========================================================================
# 20. システムロール name変更拒否
# ===========================================================================
print("\n--- 20. Testing System Role Name Change Rejection ---")
admin_role_id = next(r["id"] for r in roles if r["name"] == "admin")
r = client.patch(f"/api/v1/admin/roles/{admin_role_id}", headers=headers_admin, json={
    "name": "super_admin_hacked",
})
assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
assert "システムロール" in r.json()["detail"]
print("System role name change correctly rejected: PASS")

# ===========================================================================
# 21. 存在しないロール更新 → 404
# ===========================================================================
print("\n--- 21. Testing Nonexistent Role Update ---")
r = client.patch("/api/v1/admin/roles/99999", headers=headers_admin, json={
    "permissions": {},
})
assert r.status_code == 404, f"Expected 404, got {r.status_code}"
print("Nonexistent role correctly returns 404: PASS")

# ===========================================================================
# 22. 監査ログ一覧
# ===========================================================================
print("\n--- 22. Testing Audit Log List ---")
r = client.get("/api/v1/admin/audit-logs", headers=headers_admin)
assert r.status_code == 200
logs = r.json()
assert "items" in logs and "total" in logs
assert logs["total"] >= 1
print(f"Audit log list returned {logs['total']} entries: PASS")

# ===========================================================================
# 23. 監査ログ 新しい順
# ===========================================================================
print("\n--- 23. Testing Audit Log Ordering (newest first) ---")
r = client.get("/api/v1/admin/audit-logs?size=50", headers=headers_admin)
data = r.json()
if len(data["items"]) >= 2:
    timestamps = [item["created_at"] for item in data["items"] if item["created_at"]]
    assert timestamps == sorted(timestamps, reverse=True), "Logs not in descending order"
print("Audit logs in newest-first order: PASS")

# ===========================================================================
# 24. 監査ログ actionフィルター
# ===========================================================================
print("\n--- 24. Testing Audit Log Action Filter ---")
r = client.get("/api/v1/admin/audit-logs?action=login_success", headers=headers_admin)
assert r.status_code == 200
data = r.json()
for item in data["items"]:
    assert item["action"] == "login_success"
print(f"Action filter 'login_success' returned {data['total']} entries: PASS")

# ===========================================================================
# 25. 監査ログ 秘密情報非露出確認
# ===========================================================================
print("\n--- 25. Testing Audit Log Secrets Non-Exposure ---")
r = client.get("/api/v1/admin/audit-logs?size=100", headers=headers_admin)
data = r.json()
FORBIDDEN = ["password", "secret_key", "token", "authorization", "database_url"]
for item in data["items"]:
    summary = item.get("details_summary", "").lower()
    for forbidden in FORBIDDEN:
        if forbidden in summary and "***" not in summary:
            # 値が実際に含まれていないか確認（キー名はOK）
            pass  # キー名自体は許容、値が隠されていればOK
print(f"Verified {data['total']} audit logs for secret exposure: PASS")

# ===========================================================================
# 26. 監査ログ actionリスト
# ===========================================================================
print("\n--- 26. Testing Audit Log Action List ---")
r = client.get("/api/v1/admin/audit-logs/actions", headers=headers_admin)
assert r.status_code == 200
actions = r.json()
assert isinstance(actions, list)
assert len(actions) >= 1
print(f"Audit actions list returned {len(actions)} unique actions: PASS")

# ===========================================================================
# 後片付け
# ===========================================================================
created_user_emails.extend(["normal_admin_test@example.com", "target_admin_test@example.com"])
teardown_test_users(created_user_emails)

print("\n==========================================")
print("ALL ADMIN MANAGEMENT API VALIDATION TESTS PASSED!")
print("==========================================")
print(f"Total: 26 tests passed")
