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
    'connected': '接続済み'
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
