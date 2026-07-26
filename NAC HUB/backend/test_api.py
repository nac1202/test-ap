import httpx
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

# Load .env.test if present
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
Base = db_module.Base
get_db = db_module.get_db

from app.models.user import User
from app.models.audit import AuditLog
from app.core import security
from app.main import app
from app.db.seed import seed_db

from fastapi.testclient import TestClient

print("Running API validation tests...")

# Safety guard: prevent running tests against production/development databases
# When using PostgreSQL, database name must end with '_test'
db_url = str(settings.DATABASE_URL)
if db_url.startswith("postgresql"):
    db_name = db_url.split("/")[-1].split("?")[0]
    if not db_name.endswith("_test"):
        print(f"SAFETY GUARD: PostgreSQL database name '{db_name}' does not end with '_test'.")
        print("Refusing to run tests against non-test database. Set DATABASE_URL to a test database.")
        sys.exit(1)
    print(f"Safety check passed: using test database '{db_name}'")
elif "sqlite" in db_url:
    print(f"Safety check passed: using SQLite ({db_url})")
else:
    print(f"Warning: Unknown database type in URL: {db_url}")

# Ensure tables exist in test database
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

try:
    # 1. Health check
    print("\n--- 1. Testing Health Check ---")
    r = client.get("/health")
    print(r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["database"] == "healthy"

    # Seed data
    db = SessionLocal()
    seed_db(db)
    db.close()

    # DBの初期状態をリセット (テストのために一度 seed.py と同等の状態にする)
    print("\n--- Setup: Ensuring Admin has must_change_password=True ---")
    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    assert admin_user is not None
    admin_user.password_hash = security.get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
    admin_user.must_change_password = True
    db.commit()
    db.close()

    # 2. Login as Superuser (with must_change_password=True)
    print("\n--- 2. Testing Superuser Login (Initial) ---")
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    }
    r = client.post("/api/v1/auth/login", data=login_data)
    print(r.status_code, r.json() if r.status_code != 200 else "Success (Token generated)")
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get /me Info (Should contain must_change_password=True)
    print("\n--- 3. Testing Get /me ---")
    r = client.get("/api/v1/auth/me", headers=headers)
    print(r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["email"] == settings.FIRST_SUPERUSER
    assert r.json()["must_change_password"] is True

    # 4. Access Admin-only endpoint with must_change_password=True (Should fail with 403)
    print("\n--- 4. Testing Admin-only Endpoint with must_change_password=True (Should Fail 403) ---")
    r = client.get("/api/v1/auth/admin-only", headers=headers)
    print(r.status_code, r.json())
    assert r.status_code == 403
    assert "パスワードの変更が必要です" in r.json()["detail"]

    # 5. Test Password Policy Validation on change-password
    print("\n--- 5. Testing Password Policy (Invalid passwords should fail) ---")
    policy_test_data = {
        "current_password": settings.FIRST_SUPERUSER_PASSWORD,
        "new_password": "Short1!",
        "new_password_confirm": "Short1!"
    }
    r = client.post("/api/v1/auth/change-password", json=policy_test_data, headers=headers)
    print("Short password status:", r.status_code, r.json())
    assert r.status_code == 400
    
    policy_test_data["new_password"] = "NoSpecialChar123"
    policy_test_data["new_password_confirm"] = "NoSpecialChar123"
    r = client.post("/api/v1/auth/change-password", json=policy_test_data, headers=headers)
    print("No special char status:", r.status_code, r.json())
    assert r.status_code == 400

    policy_test_data["new_password"] = settings.FIRST_SUPERUSER_PASSWORD
    policy_test_data["new_password_confirm"] = settings.FIRST_SUPERUSER_PASSWORD
    r = client.post("/api/v1/auth/change-password", json=policy_test_data, headers=headers)
    print("Same as initial status:", r.status_code, r.json())
    assert r.status_code == 400

    # 6. Change password successfully
    print("\n--- 6. Testing Successful Password Change ---")
    NEW_SECURE_PASSWORD = "NacHubNewSecurePassword2026!"
    change_data = {
        "current_password": settings.FIRST_SUPERUSER_PASSWORD,
        "new_password": NEW_SECURE_PASSWORD,
        "new_password_confirm": NEW_SECURE_PASSWORD
    }
    r = client.post("/api/v1/auth/change-password", json=change_data, headers=headers)
    print(r.status_code, r.json())
    assert r.status_code == 200
    new_token = r.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # 7. Check if must_change_password is now False
    print("\n--- 7. Testing Get /me after password change ---")
    r = client.get("/api/v1/auth/me", headers=new_headers)
    print(r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["must_change_password"] is False

    # 8. Admin-only endpoint should now succeed
    print("\n--- 8. Testing Admin-only Endpoint after password change (Should Succeed) ---")
    r = client.get("/api/v1/auth/admin-only", headers=new_headers)
    print(r.status_code, r.json())
    assert r.status_code == 200

    # 9. Old password login should be rejected
    print("\n--- 9. Testing Old Password Login Rejection ---")
    r = client.post("/api/v1/auth/login", data={"username": settings.FIRST_SUPERUSER, "password": settings.FIRST_SUPERUSER_PASSWORD})
    print("Old password login status (Expected 400):", r.status_code, r.json())
    assert r.status_code == 400

    # 10. New password login should succeed
    print("\n--- 10. Testing New Password Login ---")
    r = client.post("/api/v1/auth/login", data={"username": settings.FIRST_SUPERUSER, "password": NEW_SECURE_PASSWORD})
    print("New password login status:", r.status_code, "Success" if r.status_code == 200 else r.json())
    assert r.status_code == 200

    # 11. Create a normal user and verify password change permission limit
    print("\n--- 11. Setup Normal User and verify permissions ---")
    db = SessionLocal()
    normal_user = db.query(User).filter(User.email == "user@example.com").first()
    if not normal_user:
        normal_user = User(
            company_id=1,
            email="user@example.com",
            password_hash=security.get_password_hash("UserPassword123#"),
            first_name="Normal",
            last_name="User",
            role_id=2,
            status="active",
            must_change_password=False
        )
        db.add(normal_user)
    else:
        normal_user.password_hash = security.get_password_hash("UserPassword123#")
        normal_user.status = "active"
        normal_user.must_change_password = False
    db.commit()
    db.close()

    r = client.post("/api/v1/auth/login", data={"username": "user@example.com", "password": "UserPassword123#"})
    user_token = r.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    r = client.get("/api/v1/auth/admin-only", headers=user_headers)
    print("Normal user accessing Admin-only status (Expected 403):", r.status_code, r.json())
    assert r.status_code == 403

    # 12. Check Audit logs for secrets
    print("\n--- 12. Checking Audit Logs for secrets ---")
    db = SessionLocal()
    logs = db.query(AuditLog).all()
    for log in logs:
        details_str = str(log.details).lower()
        assert "password" not in details_str
        assert "token" not in details_str
        assert "secret_key" not in details_str
        assert NEW_SECURE_PASSWORD.lower() not in details_str
        assert settings.FIRST_SUPERUSER_PASSWORD.lower() not in details_str
    print(f"Verified {len(logs)} audit logs. No sensitive information found in details.")
    db.close()

    # ===================================================================
    # AI Chat API Tests (なっくん)
    # ===================================================================

    print("\n--- 13. Testing AI Chat without auth (Should 401) ---")
    r = client.post("/api/v1/ai/chat", json={"question": "テスト"})
    print(f"Unauthenticated chat status: {r.status_code}")
    assert r.status_code == 401

    print("\n--- 14. Testing AI Chat with must_change_password=True (Should 403) ---")
    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    admin_user.password_hash = security.get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
    admin_user.must_change_password = True
    db.commit()
    db.close()

    admin_login = client.post("/api/v1/auth/login", data={
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert admin_login.status_code == 200
    mcp_token = admin_login.json()["access_token"]
    mcp_headers = {"Authorization": f"Bearer {mcp_token}"}
    r = client.post("/api/v1/ai/chat", json={"question": "テスト"}, headers=mcp_headers)
    print(f"must_change_password chat status: {r.status_code} {r.json()}")
    assert r.status_code == 403

    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    admin_user.must_change_password = False
    db.commit()
    db.close()

    admin_login = client.post("/api/v1/auth/login", data={
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    client.delete("/api/v1/ai/history", headers=admin_headers)

    print("\n--- 15. Testing AI Chat send (Should 200) ---")
    r = client.post("/api/v1/ai/chat", json={"question": "A案件の状況を教えて"}, headers=admin_headers)
    print(f"Chat send status: {r.status_code}")
    assert r.status_code == 200
    chat_data = r.json()
    assert "answer" in chat_data
    assert "案件" in chat_data["answer"]
    assert chat_data["question"] == "A案件の状況を教えて"
    chat_id = chat_data["id"]
    print(f"Chat response: id={chat_id}, answer preview='{chat_data['answer'][:50]}...'")

    print("\n--- 16. Verifying DB storage (ai_chat_histories) ---")
    from app.models.ai import AIChatHistory, AIExecutionLog
    db = SessionLocal()
    admin_user_record = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    chat_record = db.query(AIChatHistory).filter(AIChatHistory.id == chat_id).first()
    assert chat_record is not None
    assert chat_record.user_id == admin_user_record.id
    assert chat_record.question == "A案件の状況を教えて"
    assert len(chat_record.answer) > 0
    print(f"DB record verified: user_id={chat_record.user_id}, question='{chat_record.question}'")

    exec_log = db.query(AIExecutionLog).filter(AIExecutionLog.chat_id == chat_id).first()
    assert exec_log is not None
    assert exec_log.process_details == "mock_response"
    assert exec_log.used_plugins == []
    print(f"Execution log verified: process_details='{exec_log.process_details}'")
    db.close()

    print("\n--- 17. Testing history isolation (own history only) ---")
    normal_user_login = client.post("/api/v1/auth/login", data={
        "username": "user@example.com",
        "password": "UserPassword123#"
    })
    assert normal_user_login.status_code == 200
    nu_token = normal_user_login.json()["access_token"]
    nu_headers = {"Authorization": f"Bearer {nu_token}"}

    client.delete("/api/v1/ai/history", headers=nu_headers)

    r = client.post("/api/v1/ai/chat", json={"question": "一般ユーザーの質問"}, headers=nu_headers)
    assert r.status_code == 200

    r = client.get("/api/v1/ai/history", headers=nu_headers)
    assert r.status_code == 200
    nu_history = r.json()
    for item in nu_history:
        assert item["question"] != "A案件の状況を教えて", "Normal user can see admin's history!"
    print(f"Normal user history count: {len(nu_history)} (isolated correctly)")

    r = client.get("/api/v1/ai/history", headers=admin_headers)
    assert r.status_code == 200
    admin_history = r.json()
    for item in admin_history:
        assert item["question"] != "一般ユーザーの質問", "Admin can see normal user's history!"
    print(f"Admin history count: {len(admin_history)} (isolated correctly)")

    print("\n--- 18. Testing empty question rejection (Should 422) ---")
    r = client.post("/api/v1/ai/chat", json={"question": ""}, headers=admin_headers)
    print(f"Empty question status: {r.status_code}")
    assert r.status_code == 422

    print("\n--- 19. Testing too-long question rejection (Should 422) ---")
    long_question = "あ" * 2001
    r = client.post("/api/v1/ai/chat", json={"question": long_question}, headers=admin_headers)
    print(f"Too-long question status: {r.status_code}")
    assert r.status_code == 422

    print("\n--- 20. Checking AI execution logs for secrets ---")
    db = SessionLocal()
    ai_exec_logs = db.query(AIExecutionLog).all()
    for log in ai_exec_logs:
        details_str = str(log.process_details).lower() + str(log.used_data).lower()
        assert "password" not in details_str
        assert "token" not in details_str
        assert "secret_key" not in details_str
        assert settings.FIRST_SUPERUSER_PASSWORD.lower() not in details_str
    print(f"Verified {len(ai_exec_logs)} AI execution logs. No sensitive information found.")

    audit_logs = db.query(AuditLog).filter(AuditLog.action == "ai_chat_history_cleared").all()
    for log in audit_logs:
        details_str = str(log.details).lower()
        assert "password" not in details_str
        assert "token" not in details_str
    print(f"Verified {len(audit_logs)} AI-related audit logs. No sensitive information found.")
    db.close()

    print("\n--- 21. Testing chat history clear ---")
    r = client.delete("/api/v1/ai/history", headers=admin_headers)
    assert r.status_code == 200
    r = client.get("/api/v1/ai/history", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) == 0
    print("Chat history cleared successfully")

    client.delete("/api/v1/ai/history", headers=nu_headers)

    print("\n--- Tear Down: Resetting Admin password back to initial ---")
    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    admin_user.password_hash = security.get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
    admin_user.must_change_password = True
    db.commit()
    db.close()

    print("\nAll integration API tests passed successfully!")

except Exception as e:
    print(f"Error during API validation tests: {str(e)}")
    sys.path.pop(0)
    sys.exit(1)
