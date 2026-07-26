import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

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

from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.project import Project, ProjectMember, ProjectTimeline, RecentProject
from app.models.audit import AuditLog
from app.core import security
from app.db.seed import seed_db

print("Running Projects API validation tests with TestClient...")

# Safety guard: prevent running tests against production/development databases
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

db = SessionLocal()
try:
    # 1. Health check
    print("\n--- 1. Testing Health Check ---")
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("Health check passed.")

    # Setup roles and test users
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin", permissions={"all": True})
        db.add(admin_role)

    user_role = db.query(Role).filter(Role.name == "user").first()
    if not user_role:
        user_role = Role(name="user", permissions={"read": True})
        db.add(user_role)
    db.commit()

    company = db.query(Company).first()
    if not company:
        company = Company(name="Test Company")
        db.add(company)
        db.commit()

    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin_user:
        admin_user = User(
            company_id=company.id,
            role_id=admin_role.id,
            email="admin@example.com",
            first_name="User",
            last_name="Admin",
            password_hash=security.get_password_hash("AdminPassword123"),
            status="active",
            must_change_password=False
        )
        db.add(admin_user)
    else:
        admin_user.must_change_password = False
        admin_user.password_hash = security.get_password_hash("AdminPassword123")

    normal_user = db.query(User).filter(User.email == "user@example.com").first()
    if not normal_user:
        normal_user = User(
            company_id=company.id,
            role_id=user_role.id,
            email="user@example.com",
            first_name="User",
            last_name="Normal",
            password_hash=security.get_password_hash("UserPassword123"),
            status="active",
            must_change_password=False
        )
        db.add(normal_user)
    else:
        normal_user.must_change_password = False
        normal_user.password_hash = security.get_password_hash("UserPassword123")

    other_company = db.query(Company).filter(Company.name == "Other Company").first()
    if not other_company:
        other_company = Company(name="Other Company")
        db.add(other_company)
        db.commit()

    other_user = db.query(User).filter(User.email == "other@othercompany.com").first()
    if not other_user:
        other_user = User(
            company_id=other_company.id,
            role_id=user_role.id,
            email="other@othercompany.com",
            first_name="Other",
            last_name="User",
            password_hash=security.get_password_hash("OtherPassword123"),
            status="active",
            must_change_password=False
        )
        db.add(other_user)
        db.commit()

    db.commit()

    # Get Admin JWT Token
    r_admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@example.com", "password": "AdminPassword123"}
    )
    assert r_admin_login.status_code == 200, f"Admin login failed: {r_admin_login.text}"
    admin_token = r_admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Get Normal User JWT Token
    r_user_login = client.post(
        "/api/v1/auth/login",
        data={"username": "user@example.com", "password": "UserPassword123"}
    )
    assert r_user_login.status_code == 200, f"User login failed: {r_user_login.text}"
    user_token = r_user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    print("Tokens retrieved successfully.")

    # 2. Test Unauthenticated Access
    print("\n--- 2. Testing Unauthenticated Access ---")
    r_unauth = client.get("/api/v1/projects")
    assert r_unauth.status_code == 401
    print("Unauthenticated access correctly rejected with 401")

    # Test Producers Endpoint & Isolation
    print("\n--- Testing Producers Endpoint ---")
    r_unauth_prod = client.get("/api/v1/projects/producers")
    assert r_unauth_prod.status_code == 401
    
    r_producers = client.get("/api/v1/projects/producers", headers=user_headers)
    assert r_producers.status_code == 200
    producers_list = r_producers.json()
    producer_ids = [p["id"] for p in producers_list]
    assert admin_user.id in producer_ids
    assert normal_user.id in producer_ids
    assert other_user.id not in producer_ids
    print("Producers list fetched and isolated by company successfully.")

    # 3. Test Create Project
    print("\n--- 3. Testing Create Project ---")
    new_project_data = {
        "name": "新規Webシステム開発",
        "producer_id": admin_user.id,
        "progress_rate": 15.5,
        "status": "normal",
        "member_user_ids": [normal_user.id]
    }
    r_create = client.post("/api/v1/projects", json=new_project_data, headers=admin_headers)
    assert r_create.status_code == 201, f"Create project failed: {r_create.text}"
    project_res = r_create.json()
    project_id = project_res["id"]
    assert project_res["name"] == "新規Webシステム開発"
    assert project_res["producer_id"] == admin_user.id
    assert project_res["producer_name"] == f"{admin_user.last_name} {admin_user.first_name}"
    print(f"Project created with ID: {project_id}")

    # 4. Test List Projects
    print("\n--- 4. Testing List Projects & Filters ---")
    r_list = client.get("/api/v1/projects", headers=user_headers)
    assert r_list.status_code == 200
    list_res = r_list.json()
    assert list_res["total"] >= 1
    assert any(p["id"] == project_id for p in list_res["items"])

    # Search filter
    r_search = client.get("/api/v1/projects?search=Webシステム", headers=user_headers)
    assert r_search.status_code == 200
    assert r_search.json()["total"] >= 1

    # Status filter
    r_status = client.get("/api/v1/projects?status=normal", headers=user_headers)
    assert r_status.status_code == 200
    assert r_status.json()["total"] >= 1
    print("List & search filters working properly.")

    # 5. Test Get Project Detail
    print("\n--- 5. Testing Get Project Detail ---")
    r_detail = client.get(f"/api/v1/projects/{project_id}", headers=user_headers)
    assert r_detail.status_code == 200
    detail_res = r_detail.json()
    assert detail_res["id"] == project_id
    assert len(detail_res["members"]) >= 1
    assert len(detail_res["timelines"]) >= 1

    # Check RecentProject tracking
    db.expire_all()
    recent = db.query(RecentProject).filter(
        RecentProject.user_id == normal_user.id,
        RecentProject.project_id == project_id
    ).first()
    assert recent is not None
    print("Project detail retrieved & recent_projects tracked successfully.")

    # 6. Test Update Project
    print("\n--- 6. Testing Update Project ---")
    update_data = {
        "progress_rate": 50.0,
        "status": "warning"
    }
    r_update = client.put(f"/api/v1/projects/{project_id}", json=update_data, headers=admin_headers)
    assert r_update.status_code == 200
    updated_res = r_update.json()
    assert updated_res["progress_rate"] == 50.0
    assert updated_res["status"] == "warning"
    print("Project updated successfully.")

    # 7. Test Add & Delete Project Member
    print("\n--- 7. Testing Members Management ---")
    r_members = client.get(f"/api/v1/projects/{project_id}/members", headers=user_headers)
    assert r_members.status_code == 200

    # Add a member
    r_add_member = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={"user_id": normal_user.id, "role": "developer"},
        headers=admin_headers
    )
    if r_add_member.status_code == 400:
        assert "already a member" in r_add_member.json()["detail"]

    # Delete member
    r_del_member = client.delete(f"/api/v1/projects/{project_id}/members/{normal_user.id}", headers=admin_headers)
    assert r_del_member.status_code == 200
    print("Members management endpoints verified.")

    # 8. Test Timelines
    print("\n--- 8. Testing Timeline Management ---")
    timeline_data = {
        "event_type": "milestone",
        "content": "基本設計フェーズ完了"
    }
    r_timeline_post = client.post(
        f"/api/v1/projects/{project_id}/timelines",
        json=timeline_data,
        headers=user_headers
    )
    assert r_timeline_post.status_code == 201
    assert r_timeline_post.json()["content"] == "基本設計フェーズ完了"

    r_timeline_get = client.get(f"/api/v1/projects/{project_id}/timelines", headers=user_headers)
    assert r_timeline_get.status_code == 200
    assert len(r_timeline_get.json()) >= 2
    print("Timeline endpoints verified.")

    # 9. Test Delete Project Permission Guard (Normal user should get 403)
    print("\n--- 9. Testing Delete Permission Guard ---")
    r_del_user = client.delete(f"/api/v1/projects/{project_id}", headers=user_headers)
    assert r_del_user.status_code == 403
    print("Normal user deletion attempt correctly forbidden with 403.")

    # 10. Test Delete Project as Admin
    print("\n--- 10. Testing Admin Delete Project ---")
    r_del_admin = client.delete(f"/api/v1/projects/{project_id}", headers=admin_headers)
    assert r_del_admin.status_code == 200
    
    # Confirm deletion
    r_get_deleted = client.get(f"/api/v1/projects/{project_id}", headers=admin_headers)
    assert r_get_deleted.status_code == 404
    print("Admin deleted project successfully.")

    # 11. Verify Audit Logs
    print("\n--- 11. Testing Audit Logs ---")
    db.expire_all()
    audits = db.query(AuditLog).filter(AuditLog.user_id == admin_user.id).all()
    actions = [a.action for a in audits]
    assert "create_project" in actions
    assert "update_project" in actions
    assert "delete_project" in actions
    print("Audit logs verified.")

    print("\n==========================================")
    print("ALL 11 PROJECTS API VALIDATION TESTS PASSED!")
    print("==========================================\n")

finally:
    if db:
        db.close()
