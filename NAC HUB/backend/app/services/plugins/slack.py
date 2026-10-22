from typing import Dict, Any, Tuple
from app.services.plugins.base import BasePluginAdapter

class SlackPluginAdapter(BasePluginAdapter):
    plugin_key = 'slack'
    display_name = 'Slack'
    category = 'チャット連携'
    description = 'Slack内の許可されたチャンネル情報をNAC HUBから参照するための連携です。'

    def validate_settings(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        self.validate_non_sensitive(settings)
        ws = settings.get('workspace_name', '')
        if ws and len(str(ws)) > 100:
            return False, 'ワークスペース名は100文字以内で入力してください。'
        return True, ''

    def evaluate_status(self, is_active: bool, settings: Dict[str, Any]) -> str:
        if not is_active:
            return 'disabled'
        ws = str(settings.get('workspace_name', '')).strip()
        if not ws:
            return 'not_configured'
        return 'needs_credentials'

    def check_configuration(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_non_sensitive(settings)
        ws = str(settings.get('workspace_name', '')).strip()
        if not ws:
            return {
                'success': False,
                'status': 'not_configured',
                'message': 'ワークスペース名が設定されていません。基本設定を入力してください。'
            }
        return {
            'success': True,
            'status': 'needs_credentials',
            'message': '基本設定（ワークスペース情報）を確認しました。本接続にはSlack OAuth認証またはBot連携設定が必要です（現フェーズでは未接続）。'
        }

    def can_enable(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        ws = str(settings.get('workspace_name', '')).strip()
        if not ws:
            return False, 'ワークスペース名が未設定です。基本設定を保存してから有効化してください。'
        return True, ''
