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
from app.models.notice import Notice
from app.models.audit import AuditLog
from app.core import security
from app.main import app
from app.db.seed import seed_db

from fastapi.testclient import TestClient

print("Running Notices API tests...")

db_url = str(settings.DATABASE_URL)
if db_url.startswith("postgresql"):
    db_name = db_url.split("/")[-1].split("?")[0]
    if not db_name.endswith("_test"):
        print("Refusing to run tests against non-test database.")
        sys.exit(1)

Base.metadata.drop_all(bind=engine)
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
    db = SessionLocal()
    seed_db(db)
    
    admin_user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    admin_user.must_change_password = False
    db.commit()
    
    admin_login = client.post("/api/v1/auth/login", data={"username": settings.FIRST_SUPERUSER, "password": settings.FIRST_SUPERUSER_PASSWORD})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
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
        db.commit()
    
    user_login = client.post("/api/v1/auth/login", data={"username": "user@example.com", "password": "UserPassword123#"})
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    
    print("\n--- Testing Unauthorized ---")
    r = client.get("/api/v1/notices")
    assert r.status_code == 401

    print("\n--- Testing Notice Creation as Admin ---")
    new_notice = {
        "title": "System Update",
        "body": "System will be updated tomorrow",
        "category": "Maintenance",
        "is_important": True,
        "is_active": True
    }
    r = client.post("/api/v1/notices", json=new_notice, headers=admin_headers)
    assert r.status_code == 200
    notice_id = r.json()["id"]
    assert r.json()["title"] == "System Update"
    
    print("\n--- Testing Audit Log for Creation ---")
    audit = db.query(AuditLog).filter(AuditLog.action == "CREATE_NOTICE").first()
    assert audit is not None
    assert audit.details["entity_id"] == notice_id
    assert "System Update" in audit.details["entity_name"]

    print("\n--- Testing Notice Creation as Normal User (Should Fail) ---")
    r = client.post("/api/v1/notices", json=new_notice, headers=user_headers)
    assert r.status_code == 403

    print("\n--- Testing Notice Listing as Normal User ---")
    r = client.get("/api/v1/notices", headers=user_headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    assert any(n["id"] == notice_id for n in r.json()["items"])

    print("\n--- Testing Notice Update as Admin ---")
    update_notice = {
        "title": "System Update Revised",
    }
    r = client.put(f"/api/v1/notices/{notice_id}", json=update_notice, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["title"] == "System Update Revised"
    assert r.json()["body"] == "System will be updated tomorrow"
    
    print("\n--- Testing Audit Log for Update ---")
    audit_update = db.query(AuditLog).filter(AuditLog.action == "UPDATE_NOTICE").first()
    assert audit_update is not None
    assert audit_update.details["entity_id"] == notice_id
    assert "updated_fields" in audit_update.details

    db.close()
    
    print("\nAll Notices API tests passed successfully!")

except Exception as e:
    print(f"Error during tests: {str(e)}")
    sys.exit(1)
