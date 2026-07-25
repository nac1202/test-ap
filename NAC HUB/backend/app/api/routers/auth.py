import re
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core import security
from app.core.config import settings
from app.db.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.api.deps import get_current_active_user, get_current_admin_user

router = APIRouter()

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str

def validate_password_strength(password: str) -> str | None:
    if len(password) < 12:
        return "パスワードは12文字以上である必要があります。"
    if not re.search(r"[A-Z]", password):
        return "パスワードには少なくとも1つの英大文字を含める必要があります。"
    if not re.search(r"[a-z]", password):
        return "パスワードには少なくとも1つの英小文字を含める必要があります。"
    if not re.search(r"\d", password):
        return "パスワードには少なくとも1つの数字を含める必要があります。"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return "パスワードには少なくとも1つの記号を含める必要があります。"
    return None

@router.post("/login")
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        user_id = user.id if user else None
        db.add(AuditLog(
            user_id=user_id,
            action="login_failed",
            details={"email": form_data.username, "reason": "Incorrect credentials"}
        ))
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif user.status != "active":
        db.add(AuditLog(
            user_id=user.id,
            action="login_failed",
            details={"email": form_data.username, "reason": "User is inactive"}
        ))
        db.commit()
        raise HTTPException(status_code=400, detail="Inactive user")
    
    db.add(AuditLog(
        user_id=user.id,
        action="login_success",
        details={"email": user.email}
    ))
    db.commit()
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            {"sub": str(user.id), "role_id": user.role_id, "company_id": user.company_id}, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role_id": current_user.role_id,
        "company_id": current_user.company_id,
        "must_change_password": current_user.must_change_password
    }

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Change password for the current user
    """
    if not security.verify_password(data.current_password, current_user.password_hash):
        db.add(AuditLog(
            user_id=current_user.id,
            action="change_password_failed",
            details={"reason": "Incorrect current password"}
        ))
        db.commit()
        raise HTTPException(status_code=400, detail="現在のパスワードが正しくありません。")
        
    if data.new_password != data.new_password_confirm:
        raise HTTPException(status_code=400, detail="新しいパスワードと確認用パスワードが一致しません。")
        
    if data.new_password == data.current_password:
        raise HTTPException(status_code=400, detail="新しいパスワードは現在のパスワードと同じにすることはできません。")
        
    if current_user.email == settings.FIRST_SUPERUSER and data.new_password == settings.FIRST_SUPERUSER_PASSWORD:
        raise HTTPException(status_code=400, detail="初期設定と同じパスワードは使用できません。")
        
    error_msg = validate_password_strength(data.new_password)
    if error_msg:
        raise HTTPException(status_code=400, detail=error_msg)
        
    current_user.password_hash = security.get_password_hash(data.new_password)
    current_user.must_change_password = False
    
    db.add(AuditLog(
        user_id=current_user.id,
        action="change_password",
        details={"user_email": current_user.email}
    ))
    db.commit()
    db.refresh(current_user)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_token = security.create_access_token(
        {"sub": str(current_user.id), "role_id": current_user.role_id, "company_id": current_user.company_id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "detail": "パスワードが正常に変更されました。"
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """
    Logout client side and record audit log
    """
    db.add(AuditLog(
        user_id=current_user.id,
        action="logout",
        details={"email": current_user.email}
    ))
    db.commit()
    return {"detail": "Logged out successfully"}

@router.get("/admin-only")
def read_admin_only_data(current_admin: User = Depends(get_current_admin_user)):
    """
    Test endpoint for system admin privilege validation
    """
    return {"detail": f"Welcome Admin, {current_admin.email}!"}

