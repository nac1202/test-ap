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
from app.models.notification import Notification
from app.core import security
from app.main import app
from app.db.seed import seed_db

from fastapi.testclient import TestClient

print("Running Notifications API tests...")

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
    
    # Create an extra user to test isolation
    other_user = User(
        company_id=1,
        email="other@example.com",
        password_hash=security.get_password_hash("Password123#"),
        first_name="Other",
        last_name="User",
        role_id=2,
        status="active",
        must_change_password=False
    )
    db.add(other_user)
    
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
    db.refresh(other_user)
    db.refresh(normal_user)

    # Seed notifications
    n1 = Notification(user_id=normal_user.id, type="general", title="My Notification 1", body="Body 1", is_read=False)
    n2 = Notification(user_id=normal_user.id, type="general", title="My Notification 2", body="Body 2", is_read=True)
    n3 = Notification(user_id=other_user.id, type="general", title="Other Notification", body="Other Body", is_read=False)
    db.add_all([n1, n2, n3])
    db.commit()
    db.refresh(n1)
    db.refresh(n2)
    db.refresh(n3)
    db.close()

    print("\n--- Testing Unauthorized ---")
    r = client.get("/api/v1/notifications")
    assert r.status_code == 401

    login = client.post("/api/v1/auth/login", data={"username": "user@example.com", "password": "UserPassword123#"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- Testing Get Notifications (Isolation & Pagination) ---")
    r = client.get("/api/v1/notifications", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    titles = [item["title"] for item in data["items"]]
    assert "My Notification 1" in titles
    assert "My Notification 2" in titles
    assert "Other Notification" not in titles
    
    print("\n--- Testing Unread Count ---")
    r = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert r.status_code == 200
    assert r.json()["unread_count"] == 1

    print("\n--- Testing Mark as Read ---")
    r = client.patch(f"/api/v1/notifications/{n1.id}/read", headers=headers)
    assert r.status_code == 200
    assert r.json()["is_read"] == True

    print("\n--- Testing Unread Count After Read ---")
    r = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert r.json()["unread_count"] == 0

    print("\n--- Testing Mark Other User Notification as Read (Should Fail) ---")
    r = client.patch(f"/api/v1/notifications/{n3.id}/read", headers=headers)
    assert r.status_code == 404

    print("\n--- Testing Mark All as Read ---")
    r = client.patch("/api/v1/notifications/read-all", headers=headers)
    assert r.status_code == 200
    
    print("\nAll Notifications API tests passed successfully!")

except Exception as e:
    print(f"Error during tests: {str(e)}")
    sys.exit(1)
