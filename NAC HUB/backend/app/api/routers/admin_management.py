"""
管理画面API: ユーザー管理・ロール管理・監査ログ
- 全エンドポイントJWT認証必須
- ユーザー管理・ロール管理は管理者のみ
- 監査ログは管理者のみ（読み取り専用）
- ユーザーは自社スコープのみ操作可能
- rolesはグローバル（company_idなし）
- audit_logsはuser_id経由で自社フィルタ
"""
import re
import secrets
import string
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_admin_user, get_db
from app.models.user import User
from app.models.role import Role
from app.models.audit import AuditLog
from app.core import security

router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    id: int
    company_id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role_id: int
    role_name: Optional[str]
    status: str
    must_change_password: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class UserCreateResponse(UserResponse):
    """ユーザー作成レスポンス（初期パスワードのみこのタイミングで返す）"""
    initial_password: str


class UserListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[UserResponse]


class UserCreateRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role_id: int
    status: str = "active"

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("有効なメールアドレスを入力してください")
        return v.lower().strip()

    @field_validator("status")
    @classmethod
    def status_value(cls, v: str) -> str:
        if v not in ("active", "inactive"):
            raise ValueError("statusは 'active' または 'inactive' で指定してください")
        return v


class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role_id: Optional[int] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def status_value(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("active", "inactive"):
            raise ValueError("statusは 'active' または 'inactive' で指定してください")
        return v


class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: Optional[dict]
    user_count: int = 0
    is_system: bool = False

    class Config:
        from_attributes = True


class RoleUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    permissions: Optional[dict] = None


class AuditLogEntry(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: Optional[str]
    user_display_name: Optional[str]
    action: str
    details_summary: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[AuditLogEntry]


# ---------------------------------------------------------------------------
# セキュリティユーティリティ
# ---------------------------------------------------------------------------

SENSITIVE_KEYS = {
    "password", "password_hash", "hashed_password", "secret_key", "token",
    "authorization", "database_url", "api_key", "oauth_secret",
    "access_token", "refresh_token",
}

def sanitize_details(details: Optional[dict]) -> str:
    """detailsから秘密情報を除外してサマリ文字列を生成する"""
    if not details:
        return ""
    safe = {}
    for k, v in details.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS):
            safe[k] = "***"
        else:
            safe[k] = v
    # 簡潔なサマリ（最大200文字）
    try:
        parts = [f"{k}: {v}" for k, v in safe.items()]
        summary = " / ".join(parts)
        return summary[:200]
    except Exception:
        return ""


def _get_admin_count(db: Session, company_id: int) -> int:
    """会社の有効な管理者数を返す"""
    admin_roles = db.query(Role).filter(Role.name.in_(["admin", "system_admin"])).all()
    admin_role_ids = [r.id for r in admin_roles]
    return db.query(User).filter(
        User.company_id == company_id,
        User.role_id.in_(admin_role_ids),
        User.status == "active"
    ).count()


def _build_user_response(user: User, db: Session) -> UserResponse:
    role = db.query(Role).filter(Role.id == user.role_id).first()
    return UserResponse(
        id=user.id,
        company_id=user.company_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_id=user.role_id,
        role_name=role.name if role else None,
        status=user.status,
        must_change_password=user.must_change_password,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _generate_initial_password() -> str:
    """安全な初期パスワードを生成する（12文字以上、ポリシー準拠）"""
    upper = string.ascii_uppercase
    lower = string.ascii_lowercase
    digits = string.digits
    symbols = "!@#$%^&*"
    # 各カテゴリから最低1文字
    pwd = [
        secrets.choice(upper),
        secrets.choice(lower),
        secrets.choice(digits),
        secrets.choice(symbols),
    ]
    # 残り8文字をランダムに
    all_chars = upper + lower + digits + symbols
    pwd += [secrets.choice(all_chars) for _ in range(8)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


# ---------------------------------------------------------------------------
# ユーザー管理エンドポイント
# ---------------------------------------------------------------------------

@router.get("/users", response_model=UserListResponse)
def list_users(
    search: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """ユーザー一覧（自社スコープのみ）"""
    q = db.query(User).filter(User.company_id == current_admin.company_id)

    if search and search.strip():
        kw = f"%{search.strip()}%"
        q = q.filter(
            (User.email.ilike(kw)) |
            (User.first_name.ilike(kw)) |
            (User.last_name.ilike(kw))
        )
    if role_id is not None:
        q = q.filter(User.role_id == role_id)
    if status_filter and status_filter != "all":
        q = q.filter(User.status == status_filter)

    total = q.count()
    users = q.order_by(User.id).offset((page - 1) * size).limit(size).all()

    items = [_build_user_response(u, db) for u in users]
    return UserListResponse(total=total, page=page, size=size, items=items)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """ユーザー詳細（自社スコープのみ）"""
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == current_admin.company_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return _build_user_response(user, db)


@router.post("/users", response_model=UserCreateResponse, status_code=201)
def create_user(
    data: UserCreateRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    ユーザー作成
    - 自社スコープ
    - メール重複チェック
    - 有効なroleのみ指定可能
    - 初期パスワード自動生成（must_change_password=True）
    - 初期パスワードはAPIレスポンスに返す（管理者が安全に伝達する責任を持つ）
    - hashed_passwordはレスポンスに含まない
    """
    # メール重複チェック（全社横断）
    existing = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="このメールアドレスはすでに使用されています")

    # 有効なroleチェック
    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="指定されたロールが存在しません")

    initial_password = _generate_initial_password()

    new_user = User(
        company_id=current_admin.company_id,
        email=data.email.lower().strip(),
        password_hash=security.get_password_hash(initial_password),
        first_name=data.first_name,
        last_name=data.last_name,
        role_id=data.role_id,
        status=data.status,
        must_change_password=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    db.add(AuditLog(
        user_id=current_admin.id,
        action="create_user",
        details={
            "created_email": new_user.email,
            "role_id": data.role_id,
            "created_by": current_admin.email,
        }
    ))
    db.commit()

    role_obj = db.query(Role).filter(Role.id == new_user.role_id).first()
    return UserCreateResponse(
        id=new_user.id,
        company_id=new_user.company_id,
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        role_id=new_user.role_id,
        role_name=role_obj.name if role_obj else None,
        status=new_user.status,
        must_change_password=new_user.must_change_password,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at,
        initial_password=initial_password,
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    ユーザー更新（first_name, last_name, role_id, status）
    安全ガード:
    - 他社ユーザー変更不可
    - 自分自身をinactiveにできない
    - 最後の管理者保護
    - 最後の管理者からadminロールを外せない
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == current_admin.company_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # 自分自身をinactiveにするチェック
    if data.status == "inactive" and user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="自分自身を無効化することはできません")

    # 管理者保護チェック
    if data.status == "inactive":
        admin_count = _get_admin_count(db, current_admin.company_id)
        target_is_admin = db.query(Role).filter(
            Role.id == user.role_id,
            Role.name.in_(["admin", "system_admin"])
        ).first() is not None
        if target_is_admin and admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="最後の有効な管理者を無効化することはできません"
            )

    # roleをuserに変更する場合の管理者保護
    if data.role_id is not None and data.role_id != user.role_id:
        new_role = db.query(Role).filter(Role.id == data.role_id).first()
        if not new_role:
            raise HTTPException(status_code=400, detail="指定されたロールが存在しません")
        current_role = db.query(Role).filter(Role.id == user.role_id).first()
        if current_role and current_role.name in ("admin", "system_admin"):
            if new_role.name not in ("admin", "system_admin"):
                admin_count = _get_admin_count(db, current_admin.company_id)
                if admin_count <= 1:
                    raise HTTPException(
                        status_code=400,
                        detail="最後の管理者からadminロールを外すことはできません"
                    )

    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.role_id is not None:
        user.role_id = data.role_id
    if data.status is not None:
        user.status = data.status

    db.commit()
    db.refresh(user)

    db.add(AuditLog(
        user_id=current_admin.id,
        action="update_user",
        details={
            "target_user_id": user_id,
            "target_email": user.email,
            "updated_by": current_admin.email,
        }
    ))
    db.commit()

    return _build_user_response(user, db)


# ---------------------------------------------------------------------------
# ロール管理エンドポイント
# ---------------------------------------------------------------------------

SYSTEM_ROLE_NAMES = {"admin", "system_admin", "user"}


@router.get("/roles", response_model=List[RoleResponse])
def list_roles(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """ロール一覧（グローバル・利用ユーザー数付き）"""
    roles = db.query(Role).order_by(Role.id).all()
    result = []
    for role in roles:
        user_count = db.query(User).filter(
            User.role_id == role.id,
            User.company_id == current_admin.company_id
        ).count()
        result.append(RoleResponse(
            id=role.id,
            name=role.name,
            permissions=role.permissions,
            user_count=user_count,
            is_system=role.name in SYSTEM_ROLE_NAMES,
        ))
    return result


@router.patch("/roles/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    data: RoleUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    ロール更新（name, permissions）
    - システムロール（admin, system_admin, user）のname変更不可
    - 全フィールド任意（PATCHセマンティクス）
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="ロールが見つかりません")

    if data.name is not None:
        if role.name in SYSTEM_ROLE_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"システムロール '{role.name}' の名前は変更できません"
            )
        # 重複チェック
        existing = db.query(Role).filter(Role.name == data.name, Role.id != role_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="同名のロールが既に存在します")
        role.name = data.name

    if data.permissions is not None:
        role.permissions = data.permissions

    db.commit()
    db.refresh(role)

    db.add(AuditLog(
        user_id=current_admin.id,
        action="update_role",
        details={"role_id": role_id, "role_name": role.name, "updated_by": current_admin.email}
    ))
    db.commit()

    user_count = db.query(User).filter(
        User.role_id == role.id,
        User.company_id == current_admin.company_id
    ).count()
    return RoleResponse(
        id=role.id,
        name=role.name,
        permissions=role.permissions,
        user_count=user_count,
        is_system=role.name in SYSTEM_ROLE_NAMES,
    )


# ---------------------------------------------------------------------------
# 監査ログエンドポイント（READ ONLY）
# ---------------------------------------------------------------------------

@router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs(
    search: Optional[str] = Query(None),
    action_filter: Optional[str] = Query(None, alias="action"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    監査ログ一覧（READ ONLY）
    - 自社ユーザーのログのみ（user_id経由でフィルタ）
    - system操作（user_id=None）も含む
    - 新しい順
    - detailsから秘密情報を除外
    """
    # 自社user_idのリスト
    company_user_ids = [
        u.id for u in db.query(User.id).filter(
            User.company_id == current_admin.company_id
        ).all()
    ]

    q = db.query(AuditLog).filter(
        (AuditLog.user_id.in_(company_user_ids)) | (AuditLog.user_id.is_(None))
    )

    if search and search.strip():
        kw = f"%{search.strip()}%"
        q = q.filter(AuditLog.action.ilike(kw))

    if action_filter and action_filter.strip():
        q = q.filter(AuditLog.action == action_filter.strip())

    if date_from:
        q = q.filter(AuditLog.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(AuditLog.created_at <= datetime.combine(date_to, datetime.max.time()))

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size).all()

    # user情報マップ
    user_map: dict[int, User] = {}
    for uid in set(log.user_id for log in logs if log.user_id):
        u = db.query(User).filter(User.id == uid).first()
        if u:
            user_map[uid] = u

    items = []
    for log in logs:
        u = user_map.get(log.user_id) if log.user_id else None
        items.append(AuditLogEntry(
            id=log.id,
            user_id=log.user_id,
            user_email=u.email if u else None,
            user_display_name=f"{u.last_name} {u.first_name}" if u else "システム",
            action=log.action,
            details_summary=sanitize_details(log.details),
            created_at=log.created_at,
        ))

    return AuditLogListResponse(total=total, page=page, size=size, items=items)


@router.get("/audit-logs/actions", response_model=List[str])
def list_audit_actions(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """監査ログに存在するactionの一覧を返す（フィルタUI用）"""
    company_user_ids = [
        u.id for u in db.query(User.id).filter(
            User.company_id == current_admin.company_id
        ).all()
    ]
    actions = db.query(AuditLog.action).filter(
        (AuditLog.user_id.in_(company_user_ids)) | (AuditLog.user_id.is_(None))
    ).distinct().order_by(AuditLog.action).all()
    return [a[0] for a in actions]
