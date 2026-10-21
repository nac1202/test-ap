"""
システム設定 API:
- システム管理者のみ更新可能 (JWT認証必須)
- 会社単位 (company_id) のスコープ分離
- 秘密情報 (パスワード・APIキー等) を保存・返却しない
- 非SE向け日本語の監査ログ記録
- 一般ユーザー・未認証用の公開設定API分離
"""
import re
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_db
from app.models.user import User
from app.models.company import Company
from app.models.setting import TenantSetting
from app.models.audit import AuditLog
from app.core.config import settings

router = APIRouter()
public_router = APIRouter()

# デフォルト設定値
DEFAULT_SYSTEM_NAME = "NAC HUB"
DEFAULT_THEME_COLOR = "#FF6B00"
DEFAULT_TIMEZONE = "Asia/Tokyo"
DEFAULT_NOTICE_COUNT = 5
DEFAULT_MAINTENANCE_MODE = False

# バージョン情報定数
BUILD_NUMBER = "20261021"
LAST_UPDATED_AT = "2026-10-21"



# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class SystemVersionInfo(BaseModel):
    version: str
    build_number: str
    updated_at: str


class SystemSettingsResponse(BaseModel):
    company_name: str
    system_name: str
    theme_color: str
    timezone: str
    notice_display_count: int
    maintenance_mode: bool
    version_info: SystemVersionInfo


class PublicSystemSettingsResponse(BaseModel):
    company_name: str
    system_name: str
    theme_color: str
    timezone: str
    maintenance_mode: bool
    version_info: SystemVersionInfo


class SystemSettingsUpdateRequest(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=100, description="会社表示名")
    system_name: str = Field(..., min_length=1, max_length=100, description="システム表示名")
    theme_color: str = Field(..., description="コーポレートカラー(HEX)")
    timezone: str = Field(default="Asia/Tokyo", description="タイムゾーン")
    notice_display_count: int = Field(default=5, ge=1, le=50, description="お知らせ表示件数(1-50)")
    maintenance_mode: bool = Field(default=False, description="メンテナンス案内表示")

    @field_validator("company_name", "system_name")
    @classmethod
    def validate_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("空白のみの指定はできません")
        return s

    @field_validator("theme_color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        s = v.strip()
        if not re.match(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", s):
            raise ValueError("有効なカラーコード (例: #FF6B00 または #F90) を指定してください")
        return s.upper()

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        allowed = {"Asia/Tokyo", "UTC", "America/New_York", "Europe/London"}
        if v not in allowed:
            raise ValueError(f"指定可能なタイムゾーンは {', '.join(allowed)} です")
        return v


# ---------------------------------------------------------------------------
# ヘルパー関数
# ---------------------------------------------------------------------------

def _get_tenant_setting(db: Session, company_id: int, key: str, default: str) -> str:
    setting = db.query(TenantSetting).filter(
        TenantSetting.company_id == company_id,
        TenantSetting.key == key
    ).first()
    if setting and setting.value is not None:
        return setting.value
    return default


def _set_tenant_setting(db: Session, company_id: int, key: str, value: str) -> None:
    setting = db.query(TenantSetting).filter(
        TenantSetting.company_id == company_id,
        TenantSetting.key == key
    ).first()
    if setting:
        setting.value = value
    else:
        setting = TenantSetting(
            company_id=company_id,
            key=key,
            value=value,
            is_secret=False
        )
        db.add(setting)


def _get_version_info() -> SystemVersionInfo:
    return SystemVersionInfo(
        version=settings.VERSION,
        build_number=BUILD_NUMBER,
        updated_at=LAST_UPDATED_AT
    )


# ---------------------------------------------------------------------------
# エンドポイント
# ---------------------------------------------------------------------------

@router.get("/system-settings", response_model=SystemSettingsResponse)
def get_system_settings(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    管理者用システム設定取得 API
    - JWT認証必須 (管理者のみ)
    - 自社スコープ (current_admin.company_id)
    - 秘密情報は一切含めない
    """
    company = db.query(Company).filter(Company.id == current_admin.company_id).first()
    company_name = company.name if company else "NAC System"
    theme_color = (company.theme_color if company and company.theme_color else DEFAULT_THEME_COLOR)
    timezone = (company.timezone if company and company.timezone else DEFAULT_TIMEZONE)

    system_name = _get_tenant_setting(db, current_admin.company_id, "system_name", DEFAULT_SYSTEM_NAME)
    notice_count_str = _get_tenant_setting(db, current_admin.company_id, "notice_display_count", str(DEFAULT_NOTICE_COUNT))
    try:
        notice_display_count = int(notice_count_str)
    except ValueError:
        notice_display_count = DEFAULT_NOTICE_COUNT

    maintenance_str = _get_tenant_setting(db, current_admin.company_id, "maintenance_mode", "false")
    maintenance_mode = maintenance_str.lower() in ("true", "1")

    return SystemSettingsResponse(
        company_name=company_name,
        system_name=system_name,
        theme_color=theme_color,
        timezone=timezone,
        notice_display_count=notice_display_count,
        maintenance_mode=maintenance_mode,
        version_info=_get_version_info(),
    )


@router.put("/system-settings", response_model=SystemSettingsResponse)
def update_system_settings(
    data: SystemSettingsUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    管理者用システム設定更新 API
    - JWT認証必須 (管理者のみ)
    - 一般ユーザーは 403 Forbidden
    - 自社スコープのみ更新可能
    - 監査ログに非SE向け日本語で変更差分を記録
    """
    company = db.query(Company).filter(Company.id == current_admin.company_id).first()
    if not company:
        # 会社レコードが未作成の場合は初期作成
        company = Company(
            id=current_admin.company_id,
            name=data.company_name,
            theme_color=data.theme_color,
            timezone=data.timezone,
        )
        db.add(company)
        db.flush()

    # 変更前の状態を取得して差分を記録
    old_company_name = company.name or ""
    old_theme_color = company.theme_color or DEFAULT_THEME_COLOR
    old_timezone = company.timezone or DEFAULT_TIMEZONE
    old_system_name = _get_tenant_setting(db, current_admin.company_id, "system_name", DEFAULT_SYSTEM_NAME)
    old_notice_count = _get_tenant_setting(db, current_admin.company_id, "notice_display_count", str(DEFAULT_NOTICE_COUNT))
    old_maintenance = _get_tenant_setting(db, current_admin.company_id, "maintenance_mode", "false").lower() in ("true", "1")

    # 会社モデルの更新
    company.name = data.company_name
    company.theme_color = data.theme_color
    company.timezone = data.timezone

    # テナント設定の更新
    _set_tenant_setting(db, current_admin.company_id, "system_name", data.system_name)
    _set_tenant_setting(db, current_admin.company_id, "notice_display_count", str(data.notice_display_count))
    _set_tenant_setting(db, current_admin.company_id, "maintenance_mode", "true" if data.maintenance_mode else "false")

    # 差分サマリの構築 (非SE向け日本語)
    changes = []
    if old_company_name != data.company_name:
        changes.append(f"会社名: 「{old_company_name}」→「{data.company_name}」")
    if old_system_name != data.system_name:
        changes.append(f"システム表示名: 「{old_system_name}」→「{data.system_name}」")
    if old_theme_color != data.theme_color:
        changes.append(f"コーポレートカラー: 「{old_theme_color}」→「{data.theme_color}」")
    if old_timezone != data.timezone:
        changes.append(f"タイムゾーン: 「{old_timezone}」→「{data.timezone}」")
    if old_notice_count != str(data.notice_display_count):
        changes.append(f"お知らせ表示件数: 「{old_notice_count}件」→「{data.notice_display_count}件」")
    if old_maintenance != data.maintenance_mode:
        changes.append(f"メンテナンス表示: 「{'ON' if old_maintenance else 'OFF'}」→「{'ON' if data.maintenance_mode else 'OFF'}」")

    summary_text = " / ".join(changes) if changes else "変更なし"

    # 監査ログを記録
    audit = AuditLog(
        user_id=current_admin.id,
        action="システム設定変更",
        details={
            "summary": summary_text,
            "company_name": data.company_name,
            "system_name": data.system_name,
            "updated_by": current_admin.email,
        }
    )
    db.add(audit)
    db.commit()

    return SystemSettingsResponse(
        company_name=company.name,
        system_name=data.system_name,
        theme_color=company.theme_color,
        timezone=company.timezone,
        notice_display_count=data.notice_display_count,
        maintenance_mode=data.maintenance_mode,
        version_info=_get_version_info(),
    )


@public_router.get("/system-settings/public", response_model=PublicSystemSettingsResponse)
def get_public_system_settings(
    db: Session = Depends(get_db),
):
    """
    一般ユーザー・未認証向け公開システム設定取得 API
    - 認証不要
    - システム名、コーポレートカラー、バージョン情報等の非機密情報のみ返却
    """
    company = db.query(Company).filter(Company.id == 1).first()
    company_name = company.name if company else "NAC System"
    theme_color = company.theme_color if company and company.theme_color else DEFAULT_THEME_COLOR
    timezone = company.timezone if company and company.timezone else DEFAULT_TIMEZONE

    system_name = _get_tenant_setting(db, 1, "system_name", DEFAULT_SYSTEM_NAME)
    maintenance_str = _get_tenant_setting(db, 1, "maintenance_mode", "false")
    maintenance_mode = maintenance_str.lower() in ("true", "1")

    return PublicSystemSettingsResponse(
        company_name=company_name,
        system_name=system_name,
        theme_color=theme_color,
        timezone=timezone,
        maintenance_mode=maintenance_mode,
        version_info=_get_version_info(),
    )

