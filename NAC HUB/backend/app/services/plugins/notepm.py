from typing import Dict, Any, Tuple
from app.services.plugins.base import BasePluginAdapter

class NotePMPluginAdapter(BasePluginAdapter):
    plugin_key = 'notepm'
    display_name = 'NotePM'
    category = 'ナレッジ連携'
    description = '社内マニュアルやノウハウをNAC HUBやなっくんから検索するための連携です。'

    def validate_settings(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        self.validate_non_sensitive(settings)
        td = settings.get('team_domain', '')
        if td and len(str(td)) > 100:
            return False, 'チームドメインは100文字以内で入力してください。'
        return True, ''

    def evaluate_status(self, is_active: bool, settings: Dict[str, Any]) -> str:
        if not is_active:
            return 'disabled'
        td = str(settings.get('team_domain', '')).strip()
        if not td:
            return 'not_configured'
        return 'needs_credentials'

    def check_configuration(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_non_sensitive(settings)
        td = str(settings.get('team_domain', '')).strip()
        if not td:
            return {
                'success': False,
                'status': 'not_configured',
                'message': 'チームドメインが入力されていません。基本設定を入力してください。'
            }
        return {
            'success': True,
            'status': 'needs_credentials',
            'message': '基本設定（チームドメイン情報）を確認しました。本接続にはNotePM API連携設定が必要です（現フェーズでは未接続）。'
        }

    def can_enable(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        td = str(settings.get('team_domain', '')).strip()
        if not td:
            return False, 'チームドメインが未設定です。基本設定を保存してから有効化してください。'
        return True, ''
