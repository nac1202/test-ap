import os
import sys
from datetime import datetime, timezone, timedelta

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

from fastapi.testclient import TestClient
from app.main import app
from app.models.company import Company
from app.models.role import Role
from app.models.user import User
from app.models.project import Project, RecentProject
from app.models.notification import Notification
from app.models.workflow import Workflow
from app.core import security
from app.db.seed import seed_db

client = TestClient(app)

def run_dashboard_tests():
    print("Running Dashboard API validation tests...")

    # Safety Check: DB Name MUST end with _test
    db_url = str(engine.url)
    print(f"Target DB URL: {db_url}")
    if not db_url.endswith("_test"):
        raise RuntimeError(f"CRITICAL SAFETY GUARD TRIGGERED: Refusing to run tests on non-test DB: {db_url}")
    print("Safety check passed: using test database 'nac_hub_test'")

    db = SessionLocal()

    try:
        # Seed Base DB
        seed_db(db)

        # Setup Companies & Users
        company_a = db.query(Company).filter(Company.id == 1).first()
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        user_role = db.query(Role).filter(Role.name == "user").first()

        # Company B for Multi-tenant isolation test
        company_b = db.query(Company).filter(Company.name == "Company B Test").first()
        if not company_b:
            company_b = Company(name="Company B Test")
            db.add(company_b)
            db.commit()

        user_a = db.query(User).filter(User.email == "dash_usera@example.com").first()
        if not user_a:
            user_a = User(
                company_id=company_a.id,
                role_id=user_role.id,
                email="dash_usera@example.com",
                first_name="UserA",
                last_name="Test",
                password_hash=security.get_password_hash("DashPassword123!"),
                status="active",
                must_change_password=False
            )
            db.add(user_a)
            db.commit()

        user_b = db.query(User).filter(User.email == "dash_userb@example.com").first()
        if not user_b:
            user_b = User(
                company_id=company_b.id,
                role_id=user_role.id,
                email="dash_userb@example.com",
                first_name="UserB",
                last_name="Test",
                password_hash=security.get_password_hash("DashPassword123!"),
                status="active",
                must_change_password=False
            )
            db.add(user_b)
            db.commit()

        # Auth Headers
        r_login_a = client.post("/api/v1/auth/login", data={"username": "dash_usera@example.com", "password": "DashPassword123!"})
        assert r_login_a.status_code == 200, f"Login A failed: {r_login_a.text}"
        token_a = r_login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        r_login_b = client.post("/api/v1/auth/login", data={"username": "dash_userb@example.com", "password": "DashPassword123!"})
        assert r_login_b.status_code == 200, f"Login B failed: {r_login_b.text}"
        token_b = r_login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 1. Unauthenticated Access (401)
        print("\n--- 1. Testing Unauthenticated Access ---")
        r_unauth = client.get("/api/v1/dashboard")
        assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}"
        print("Unauthenticated access rejected with 401: PASS")

        # 2. Empty State Test (Company B has no projects)
        print("\n--- 2. Testing Empty Dashboard State ---")
        r_dash_b = client.get("/api/v1/dashboard", headers=headers_b)
        assert r_dash_b.status_code == 200, f"Expected 200, got {r_dash_b.status_code}"
        data_b = r_dash_b.json()
        assert "total" in data_b["project_summary"]
        assert isinstance(data_b["recent_projects"], list)
        assert isinstance(data_b["notifications"], list)
        assert isinstance(data_b["tasks"], list)
        assert data_b["integrations"]["weather"] is False
        assert data_b["integrations"]["hotbiz"] is False
        print("Empty dashboard state handled cleanly with 200: PASS")

        # 3. Create Test Projects & Verify Summary Aggregation
        print("\n--- 3. Testing Project Summary & Multi-Tenant Isolation ---")
        # Create 1 Normal, 1 Warning, 1 Delayed in Company A
        p_normal = Project(name="Project Normal", producer_id=user_a.id, status="normal", progress_rate=50)
        p_warning = Project(name="Project Warning", producer_id=user_a.id, status="warning", progress_rate=30)
        p_delayed = Project(name="Project Delayed", producer_id=user_a.id, status="delayed", progress_rate=10)
        # Create Project in Company B
        p_comp_b = Project(name="Company B Secret Project", producer_id=user_b.id, status="normal", progress_rate=90)
        db.add_all([p_normal, p_warning, p_delayed, p_comp_b])
        db.commit()

        # Add Recent Project History for User A
        rp1 = RecentProject(user_id=user_a.id, project_id=p_normal.id, viewed_at=datetime.now(timezone.utc) - timedelta(minutes=10))
        rp2 = RecentProject(user_id=user_a.id, project_id=p_warning.id, viewed_at=datetime.now(timezone.utc))
        db.add_all([rp1, rp2])

        # Add Notifications for User A & B
        notif_a = Notification(user_id=user_a.id, type="system", title="User A Notification", body="Detail A")
        notif_b = Notification(user_id=user_b.id, type="system", title="User B Notification", body="Detail B")
        db.add_all([notif_a, notif_b])

        # Add Workflow Tasks for User A
        wf_a = Workflow(type="expense", status="pending", data={"title": "経費精算申請"})
        db.add(wf_a)

        db.commit()

        # 4. Fetch User A Dashboard
        r_dash_a = client.get("/api/v1/dashboard", headers=headers_a)
        assert r_dash_a.status_code == 200, f"Expected 200, got {r_dash_a.text}"
        data_a = r_dash_a.json()

        # Check Aggregation
        summary_a = data_a["project_summary"]
        assert summary_a["total"] >= 3
        assert summary_a["normal"] >= 1
        assert summary_a["warning"] >= 1
        assert summary_a["delayed"] >= 1
        print("Project summary aggregation verified: PASS")

        # Check Recent Projects Isolation & Order (rp2 newer than rp1)
        recents_a = data_a["recent_projects"]
        assert len(recents_a) >= 2
        assert recents_a[0]["name"] == "Project Warning"  # Most recent first
        # Verify Company B project is NOT present in Company A's dashboard
        recent_ids_a = [rp["id"] for rp in recents_a]
        assert p_comp_b.id not in recent_ids_a
        print("Recent projects user ordering & tenant isolation verified: PASS")

        # Check Notifications Isolation
        notifs_a = data_a["notifications"]
        notif_titles_a = [n["title"] for n in notifs_a]
        assert "User A Notification" in notif_titles_a
        assert "User B Notification" not in notif_titles_a
        print("Notifications user isolation verified: PASS")

        # 5. Verify Secrets Check (No password hash, no JWT secrets in response)
        json_str = r_dash_a.text
        assert "password_hash" not in json_str
        assert "NacHubPostgres2026!" not in json_str
        print("Response safety check passed (no secrets leaked): PASS")

        print("\n==========================================")
        print("ALL DASHBOARD API VALIDATION TESTS PASSED!")
        print("==========================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_dashboard_tests()
