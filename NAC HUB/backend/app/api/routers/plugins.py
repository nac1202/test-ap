from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.setting import PluginConfig
from app.models.audit import AuditLog
from app.api.deps import get_current_admin_user
from app.schemas.plugin import (
    PluginItemResponse,
    PluginListResponse,
    PluginSettingsUpdateRequest,
    PluginValidationResponse,
    STATUS_LABELS,
)
from app.services.plugins.registry import (
    get_plugin_adapter,
    get_all_adapters,
    is_supported_plugin,
)
from app.services.plugins.base import BasePluginAdapter

router = APIRouter()

def require_admin_user(current_user: User) -> None:
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='会社情報が設定されていません。'
        )

def _audit_details(adapter: BasePluginAdapter, operation: str, user: User, summary: Optional[str] = None) -> Dict[str, Any]:
    """監査ログ details（JSON dict・秘密情報なし・非SE向け日本語）"""
    d: Dict[str, Any] = {
        'service': adapter.display_name,
        'operation': operation,
        'executed_by': user.email,
    }
    if summary:
        d['summary'] = summary
    return d


def build_plugin_item(adapter: BasePluginAdapter, record: Optional[PluginConfig]) -> PluginItemResponse:
    if not record:
        raw_settings: Dict[str, Any] = {}
        is_enabled = False
        last_tested_at = None
        last_val_result = None
    else:
        config = record.config_json if isinstance(record.config_json, dict) else {}
        raw_settings = config.get('settings', {}) if isinstance(config.get('settings'), dict) else {}
        is_enabled = bool(record.is_active)
        last_tested_at = record.last_tested_at
        last_val_result = config.get('last_validation_result')

    plugin_status = adapter.evaluate_status(True, raw_settings)
    if not is_enabled and plugin_status != 'not_configured':
        plugin_status = 'disabled'
    status_label = STATUS_LABELS.get(plugin_status, '未設定')

    return PluginItemResponse(
        plugin_key=adapter.plugin_key,
        display_name=adapter.display_name,
        category=adapter.category,
        description=adapter.description,
        is_enabled=is_enabled,
        status=plugin_status,
        status_label=status_label,
        settings=raw_settings,
        last_tested_at=last_tested_at,
        last_validation_result=last_val_result,
        connected=False
    )

@router.get('', response_model=PluginListResponse)
def list_plugins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    require_admin_user(current_user)

    records = (
        db.query(PluginConfig)
        .filter(PluginConfig.company_id == current_user.company_id)
        .all()
    )
    record_map = {r.plugin_name: r for r in records}

    adapters = get_all_adapters()
    items = []
    for adapter in adapters:
        rec = record_map.get(adapter.plugin_key)
        items.append(build_plugin_item(adapter, rec))

    return PluginListResponse(total=len(items), items=items)

@router.get('/{plugin_key}', response_model=PluginItemResponse)
def get_plugin(
    plugin_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    require_admin_user(current_user)
    adapter = get_plugin_adapter(plugin_key)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'プラグイン「{plugin_key}」は見つかりません。'
        )

    record = (
        db.query(PluginConfig)
        .filter(
            PluginConfig.company_id == current_user.company_id,
            PluginConfig.plugin_name == plugin_key
        )
        .first()
    )
    return build_plugin_item(adapter, record)

@router.put('/{plugin_key}', response_model=PluginItemResponse)
def update_plugin_settings(
    plugin_key: str,
    payload: PluginSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    require_admin_user(current_user)
    adapter = get_plugin_adapter(plugin_key)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'プラグイン「{plugin_key}」は見つかりません。'
        )

    try:
        is_valid, err_msg = adapter.validate_settings(payload.settings)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    record = (
        db.query(PluginConfig)
        .filter(
            PluginConfig.company_id == current_user.company_id,
            PluginConfig.plugin_name == plugin_key
        )
        .first()
    )
    if not record:
        record = PluginConfig(
            company_id=current_user.company_id,
            plugin_name=plugin_key,
            is_active=False,
            config_json={'settings': payload.settings}
        )
        db.add(record)
    else:
        cfg = dict(record.config_json or {})
        cfg['settings'] = payload.settings
        record.config_json = cfg

    audit = AuditLog(
        user_id=current_user.id,
        action=f'{adapter.display_name}設定変更',
        details=_audit_details(adapter, '基本設定を変更', current_user)
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return build_plugin_item(adapter, record)

@router.post('/{plugin_key}/validate', response_model=PluginValidationResponse)
def validate_plugin_settings(
    plugin_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    require_admin_user(current_user)
    adapter = get_plugin_adapter(plugin_key)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'プラグイン「{plugin_key}」は見つかりません。'
        )

    record = (
        db.query(PluginConfig)
        .filter(
            PluginConfig.company_id == current_user.company_id,
            PluginConfig.plugin_name == plugin_key
        )
        .first()
    )
    config = record.config_json if (record and isinstance(record.config_json, dict)) else {}
    settings = config.get('settings', {}) if isinstance(config.get('settings'), dict) else {}

    result = adapter.check_configuration(settings)
    now = datetime.now(timezone.utc)

    if not record:
        record = PluginConfig(
            company_id=current_user.company_id,
            plugin_name=plugin_key,
            is_active=False,
            config_json={
                'settings': settings,
                'last_validation_result': result.get('message', ''),
                'last_status': result.get('status', 'not_configured')
            },
            last_tested_at=now
        )
        db.add(record)
    else:
        cfg = dict(record.config_json or {})
        cfg['last_validation_result'] = result.get('message', '')
        cfg['last_status'] = result.get('status', 'not_configured')
        record.config_json = cfg
        record.last_tested_at = now

    audit = AuditLog(
        user_id=current_user.id,
        action=f'{adapter.display_name}設定確認',
        details=_audit_details(adapter, '設定確認を実行', current_user, result.get('message', ''))
    )
    db.add(audit)
    db.commit()

    st = result.get('status', 'not_configured')
    return PluginValidationResponse(
        success=bool(result.get('success', False)),
        status=st,
        status_label=STATUS_LABELS.get(st, st),
        message=result.get('message', ''),
        tested_at=now
    )

@router.post('/{plugin_key}/enable', response_model=PluginItemResponse)
def enable_plugin(
    plugin_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    require_admin_user(current_user)
    adapter = get_plugin_adapter(plugin_key)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'プラグイン「{plugin_key}」は見つかりません。'
        )

    record = (
        db.query(PluginConfig)
        .filter(
            PluginConfig.company_id == current_user.company_id,
            PluginConfig.plugin_name == plugin_key
        )
        .first()
    )
    config = record.config_json if (record and isinstance(record.config_json, dict)) else {}
    settings = config.get('settings', {}) if isinstance(config.get('settings'), dict) else {}

    can_en, reason = adapter.can_enable(settings)
    if not can_en:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'設定が不足しているため有効化できません。{reason}'
        )

    if not record:
        record = PluginConfig(
            company_id=current_user.company_id,
            plugin_name=plugin_key,
            is_active=True,
            config_json={'settings': settings}
        )
        db.add(record)
    else:
        record.is_active = True

    audit = AuditLog(
        user_id=current_user.id,
        action=f'{adapter.display_name}を有効化',
        details=_audit_details(adapter, '利用候補として有効化', current_user)
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return build_plugin_item(adapter, record)

@router.post('/{plugin_key}/disable', response_model=PluginItemResponse)
def disable_plugin(
    plugin_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    require_admin_user(current_user)
    adapter = get_plugin_adapter(plugin_key)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'プラグイン「{plugin_key}」は見つかりません。'
        )

    record = (
        db.query(PluginConfig)
        .filter(
            PluginConfig.company_id == current_user.company_id,
            PluginConfig.plugin_name == plugin_key
        )
        .first()
    )
    if not record:
        record = PluginConfig(
            company_id=current_user.company_id,
            plugin_name=plugin_key,
            is_active=False,
            config_json={}
        )
        db.add(record)
    else:
        record.is_active = False

    audit = AuditLog(
        user_id=current_user.id,
        action=f'{adapter.display_name}を無効化',
        details=_audit_details(adapter, '無効化', current_user)
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return build_plugin_item(adapter, record)
