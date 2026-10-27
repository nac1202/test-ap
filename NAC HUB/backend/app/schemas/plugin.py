from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

STATUS_LABELS: Dict[str, str] = {
    'not_configured': '未設定',
    'configured': '基本設定済み',
    'needs_credentials': '認証情報の準備が必要',
    'not_implemented': '本接続は今後対応',
    'disabled': '無効',
    'error': '設定エラー',
    'connected': '接続済み',
    'connection_error': '接続エラー'
}

class PluginSettingsUpdateRequest(BaseModel):
    settings: Dict[str, Any] = Field(default_factory=dict, description='非機密の準備設定オブジェクト')

class PluginItemResponse(BaseModel):
    plugin_key: str
    display_name: str
    category: str
    description: str
    is_enabled: bool
    status: str
    status_label: str
    settings: Dict[str, Any]
    last_tested_at: Optional[datetime] = None
    last_validation_result: Optional[str] = None
    connected: bool = False
    # NotePMなど実API連携プラグイン用（値は返さない。設定済みかどうかの真偽のみ）
    credentials_configured: Optional[bool] = None
    allowed_note_count: Optional[int] = None
    allowed_note_names: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True

class PluginListResponse(BaseModel):
    total: int
    items: List[PluginItemResponse]

class PluginValidationResponse(BaseModel):
    success: bool
    status: str
    status_label: str
    message: str
    tested_at: datetime
    warnings: List[str] = Field(default_factory=list)


class NotePMNoteItem(BaseModel):
    """管理者向け：参照許可ノート選択用（note_code は管理画面内部での選択キーとしてのみ使用）。"""
    note_code: str
    name: str
    description: str = ''
    scope_label: str = ''
    allowed: bool = False


class NotePMNotesResponse(BaseModel):
    total: int
    items: List[NotePMNoteItem]
    allowed_count: int
    max_allowed: int


class NotePMAllowedNotesRequest(BaseModel):
    note_codes: List[str] = Field(default_factory=list, description='参照を許可するノート（最大10件）')
