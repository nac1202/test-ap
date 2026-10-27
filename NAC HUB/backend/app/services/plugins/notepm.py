from typing import Dict, Any, Tuple
from app.services.plugins.base import BasePluginAdapter
from app.services.notepm.client import NotePMError, normalize_team_domain, is_token_configured

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
        if td:
            try:
                normalize_team_domain(str(td))  # SSRF対策: *.notepm.jp の HTTPS のみ許可
            except NotePMError as err:
                return False, err.message
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
        if not is_token_configured():
            return {
                'success': False,
                'status': 'needs_credentials',
                'message': 'NotePMの認証情報（APIトークン）が設定されていません。'
            }
        return {
            'success': True,
            'status': 'needs_credentials',
            'message': '基本設定を確認しました。実API接続確認は「設定確認」で実行します。'
        }

    def can_enable(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        td = str(settings.get('team_domain', '')).strip()
        if not td:
            return False, 'チームドメインが未設定です。基本設定を保存してから有効化してください。'
        return True, ''
