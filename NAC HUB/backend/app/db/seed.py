import sys
import os
from sqlalchemy.orm import Session

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.db.database import SessionLocal
from app.models.company import Company
from app.models.role import Role
from app.models.user import User
from app.core import security
from app.core.config import settings

def seed_db(db: Session):
    print("Seeding database...")
    
    # 1. Create Default Company
    company = db.query(Company).filter(Company.id == 1).first()
    if not company:
        company = Company(
            id=1,
            name="NAC System",
            address="Tokyo, Japan",
            phone="03-1234-5678",
            theme_color="#FF6B00", # NAC Theme Color Orange
            timezone="Asia/Tokyo",
            holidays=[]
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        print("Created default company 'NAC System'")
    else:
        print("Default company already exists")

    # 2. Create Roles
    admin_role = db.query(Role).filter(Role.id == 1).first()
    if not admin_role:
        admin_role = Role(
            id=1,
            name="admin",
            permissions={"all": True}
        )
        db.add(admin_role)
        print("Created Role 'admin'")
    
    user_role = db.query(Role).filter(Role.id == 2).first()
    if not user_role:
        user_role = Role(
            id=2,
            name="user",
            permissions={"projects": {"read": True}}
        )
        db.add(user_role)
        print("Created Role 'user'")
    db.commit()

    # 3. Create Superuser
    superuser = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    from app.models.audit import AuditLog
    if not superuser:
        superuser = User(
            company_id=1,
            email=settings.FIRST_SUPERUSER,
            password_hash=security.get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            first_name="System",
            last_name="Admin",
            role_id=1, # Admin role
            status="active",
            must_change_password=True
        )
        db.add(superuser)
        db.commit()
        db.refresh(superuser)
        
        # 監査ログを保存
        db.add(AuditLog(
            user_id=superuser.id,
            action="create_initial_admin",
            details={"email": settings.FIRST_SUPERUSER}
        ))
        db.commit()
        print(f"Created system administrator account: {settings.FIRST_SUPERUSER}")
    else:
        # Update password and must_change_password if it already exists (reset) only if RESET_ADMIN_PASSWORD=true
        reset_allowed = os.getenv("RESET_ADMIN_PASSWORD", "false").lower() == "true"
        if reset_allowed:
            superuser.password_hash = security.get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
            superuser.must_change_password = True
            db.add(AuditLog(
                user_id=superuser.id,
                action="reset_initial_admin",
                details={"email": settings.FIRST_SUPERUSER}
            ))
            db.commit()
            print(f"System administrator account already exists. Password reset and must_change_password enabled.")
        else:
            print(f"System administrator account already exists. Password reset skipped (RESET_ADMIN_PASSWORD is not 'true').")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
