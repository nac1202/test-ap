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
    NotePMAllowedNotesRequest,
    NotePMNoteItem,
    NotePMNotesResponse,
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
from app.services.notepm.client import (
    NotePMClient,
    NotePMError,
    is_token_configured,
    normalize_team_domain,
)
from app.services.notepm.connection import check_connection
from app.services.notepm.search import ALLOWED_NOTES_MAX, NotePMConfig

import re

NOTEPM_KEY = 'notepm'
_NOTE_CODE_RE = re.compile(r'^[A-Za-z0-9_\-]{1,64}$')
_SCOPE_LABELS = {'open': '公開（チーム全員が参加）', 'private': '限定（参加者のみ）'}

# NotePM実APIの失敗を管理画面へ返す際のHTTPステータス（401はフロントの自動ログアウトを避けるため使わない）
_NOTEPM_HTTP_STATUS = {
    'rate_limit': status.HTTP_429_TOO_MANY_REQUESTS,
    'auth_error': status.HTTP_502_BAD_GATEWAY,
    'token_missing': status.HTTP_400_BAD_REQUEST,
    'domain_missing': status.HTTP_400_BAD_REQUEST,
    'invalid_domain': status.HTTP_400_BAD_REQUEST,
}

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


def _notepm_domain_key(settings: Dict[str, Any]) -> str:
    """チームドメインの同一判定用（正規化できない場合は入力値そのまま）。"""
    raw = str((settings or {}).get('team_domain', '') or '').strip()
    try:
        return normalize_team_domain(raw) if raw else ''
    except NotePMError:
        return raw


def _notepm_http_error(err: NotePMError) -> HTTPException:
    return HTTPException(
        status_code=_NOTEPM_HTTP_STATUS.get(err.kind, status.HTTP_503_SERVICE_UNAVAILABLE),
        detail=err.message,
    )


def _find_record(db: Session, user: User, plugin_key: str) -> Optional[PluginConfig]:
    return (
        db.query(PluginConfig)
        .filter(
            PluginConfig.company_id == user.company_id,
            PluginConfig.plugin_name == plugin_key
        )
        .first()
    )


def _notepm_host(record: Optional[PluginConfig]) -> str:
    """保存済みチームドメインを正規化して返す（未設定・不正・トークン未設定は HTTPException）。"""
    cfg = NotePMConfig(record)
    try:
        host = normalize_team_domain(cfg.team_domain)
    except NotePMError as err:
        raise _notepm_http_error(err)
    if not is_token_configured():
        raise _notepm_http_error(NotePMError('token_missing'))
    return host


def build_plugin_item(adapter: BasePluginAdapter, record: Optional[PluginConfig]) -> PluginItemResponse:
    config: Dict[str, Any] = {}
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
    connected = False
    extras: Dict[str, Any] = {}
    if adapter.plugin_key == NOTEPM_KEY:
        # 実API接続確認の結果（成功時のみ「接続済み」）。「有効」と「接続済み」は別概念。
        last_status = config.get('last_status')
        has_domain = bool(str(raw_settings.get('team_domain', '')).strip())
        if has_domain and last_status in ('connected', 'connection_error'):
            plugin_status = last_status
        connected = bool(has_domain and last_status == 'connected')
        np_cfg = NotePMConfig(record)
        warnings = config.get('last_warnings') if connected and isinstance(config.get('last_warnings'), list) else []
        extras = {
            'credentials_configured': is_token_configured(),
            'allowed_note_count': len(np_cfg.allowed_codes),
            'allowed_note_names': [np_cfg.allowed_names.get(c, '') for c in np_cfg.allowed_codes if np_cfg.allowed_names.get(c)],
            'warnings': [w for w in warnings if isinstance(w, str)],
        }
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
        connected=connected,
        **extras
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
        if plugin_key == NOTEPM_KEY:
            old_settings = cfg.get('settings') if isinstance(cfg.get('settings'), dict) else {}
            if _notepm_domain_key(old_settings) != _notepm_domain_key(payload.settings):
                # チームが変わると旧チームの許可ノート・接続結果は無効（他チームのノートを誤って参照しない）
                for k in ('allowed_note_codes', 'allowed_note_names', 'last_status',
                          'last_validation_result', 'last_warnings'):
                    cfg.pop(k, None)
                record.last_tested_at = None
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

    if plugin_key == NOTEPM_KEY:
        # NotePMのみ実API接続確認（GET /user/account）。他プラグインは従来どおり「未接続（準備段階）」。
        result = check_connection(str(settings.get('team_domain', '')))
    else:
        result = adapter.check_configuration(settings)
    warnings = [w for w in result.get('warnings', []) if isinstance(w, str)]
    now = datetime.now(timezone.utc)

    if not record:
        record = PluginConfig(
            company_id=current_user.company_id,
            plugin_name=plugin_key,
            is_active=False,
            config_json={
                'settings': settings,
                'last_validation_result': result.get('message', ''),
                'last_status': result.get('status', 'not_configured'),
                'last_warnings': warnings,
            },
            last_tested_at=now
        )
        db.add(record)
    else:
        cfg = dict(record.config_json or {})
        cfg['last_validation_result'] = result.get('message', '')
        cfg['last_status'] = result.get('status', 'not_configured')
        cfg['last_warnings'] = warnings
        record.config_json = cfg
        record.last_tested_at = now

    operation = '実API接続確認（チームドメインと認証情報）を実行' if plugin_key == NOTEPM_KEY else '設定確認を実行'
    audit = AuditLog(
        user_id=current_user.id,
        action=f'{adapter.display_name}設定確認',
        details=_audit_details(adapter, operation, current_user, result.get('message', ''))
    )
    db.add(audit)
    db.commit()

    st = result.get('status', 'not_configured')
    return PluginValidationResponse(
        success=bool(result.get('success', False)),
        status=st,
        status_label=STATUS_LABELS.get(st, st),
        message=result.get('message', ''),
        tested_at=now,
        warnings=warnings,
    )


@router.post('/notepm/test-connection', response_model=PluginValidationResponse)
def notepm_test_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """NotePM実API接続確認（「設定確認」と同じ処理。管理者のみ）。"""
    return validate_plugin_settings(NOTEPM_KEY, db, current_user)


@router.get('/notepm/notes', response_model=NotePMNotesResponse)
def notepm_list_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """トークンがアクセス可能なノート一覧（管理者のみ・参照許可ノートの選択用・アーカイブ除外）。"""
    require_admin_user(current_user)
    record = _find_record(db, current_user, NOTEPM_KEY)
    host = _notepm_host(record)
    try:
        notes = NotePMClient(host).list_notes()
    except NotePMError as err:
        raise _notepm_http_error(err)
    cfg = NotePMConfig(record)
    allowed = set(cfg.allowed_codes)
    items = [
        NotePMNoteItem(
            note_code=n.note_code,
            name=n.name,
            description=(n.description or '')[:200],
            scope_label=_SCOPE_LABELS.get(n.scope, ''),
            allowed=n.note_code in allowed,
        )
        for n in notes if not n.archived
    ]
    return NotePMNotesResponse(
        total=len(items), items=items,
        allowed_count=len(cfg.allowed_codes), max_allowed=ALLOWED_NOTES_MAX,
    )


@router.put('/notepm/allowed-notes', response_model=PluginItemResponse)
def notepm_set_allowed_notes(
    payload: NotePMAllowedNotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """NAC HUBから参照を許可するNotePMノート（ホワイトリスト）を保存する。管理者のみ。

    note_code（非機密）を plugin_configs へ保存する。トークンは保存しない。選択内容はNotePMを再取得して検証する。
    """
    require_admin_user(current_user)
    adapter = get_plugin_adapter(NOTEPM_KEY)
    record = _find_record(db, current_user, NOTEPM_KEY)

    codes: list = []
    for c in payload.note_codes:
        c = (c or '').strip()
        if not _NOTE_CODE_RE.match(c):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='ノートの指定が正しくありません。')
        if c not in codes:
            codes.append(c)
    if len(codes) > ALLOWED_NOTES_MAX:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'参照を許可できるノートは最大{ALLOWED_NOTES_MAX}件です。'
        )

    names: Dict[str, str] = {}
    if codes:
        host = _notepm_host(record)
        try:
            available = {n.note_code: n for n in NotePMClient(host).list_notes() if not n.archived}
        except NotePMError as err:
            raise _notepm_http_error(err)
        for c in codes:
            if c not in available:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='選択したノートがNotePM上で見つかりませんでした。ノート一覧を再読み込みしてください。'
                )
            names[c] = available[c].name[:100]
    elif record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='NotePMの基本設定を先に保存してください。')

    old = NotePMConfig(record)
    old_names = [old.allowed_names.get(c, '（名称不明）') for c in old.allowed_codes]
    new_names = [names[c] for c in codes]

    cfg = dict(record.config_json or {})
    cfg['allowed_note_codes'] = codes
    cfg['allowed_note_names'] = names
    record.config_json = cfg

    def _fmt(ns: list) -> str:
        return '、'.join(f'「{n}」' for n in ns) if ns else 'なし'

    # 監査ログにはノート名のみ（note_code・内部ID・トークンは記録しない）
    db.add(AuditLog(
        user_id=current_user.id,
        action='NotePM参照対象ノート変更',
        details=_audit_details(
            adapter, '参照を許可するノートを変更', current_user,
            f'参照許可ノート: {_fmt(old_names)} → {_fmt(new_names)}'
        )
    ))
    db.commit()
    db.refresh(record)
    return build_plugin_item(adapter, record)

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
