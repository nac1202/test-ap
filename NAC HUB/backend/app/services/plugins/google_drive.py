from typing import Dict, Any, Tuple
from app.services.plugins.base import BasePluginAdapter

class GoogleDrivePluginAdapter(BasePluginAdapter):
    plugin_key = 'google_drive'
    display_name = 'Google Drive'
    category = 'ストレージ連携'
    description = '共有ドライブや指定フォルダ内の資料をNAC HUBやなっくんから検索するための連携です。'

    def validate_settings(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        self.validate_non_sensitive(settings)
        dn = settings.get('drive_name', '')
        tf = settings.get('target_folder', '')
        if dn and len(str(dn)) > 100:
            return False, '共有ドライブ名は100文字以内で入力してください。'
        if tf and len(str(tf)) > 100:
            return False, '対象フォルダ名は100文字以内で入力してください。'
        return True, ''

    def evaluate_status(self, is_active: bool, settings: Dict[str, Any]) -> str:
        if not is_active:
            return 'disabled'
        dn = str(settings.get('drive_name', '')).strip()
        tf = str(settings.get('target_folder', '')).strip()
        if not dn and not tf:
            return 'not_configured'
        return 'needs_credentials'

    def check_configuration(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_non_sensitive(settings)
        dn = str(settings.get('drive_name', '')).strip()
        tf = str(settings.get('target_folder', '')).strip()
        if not dn and not tf:
            return {
                'success': False,
                'status': 'not_configured',
                'message': '共有ドライブ名または対象フォルダが入力されていません。基本設定を入力してください。'
            }
        return {
            'success': True,
            'status': 'needs_credentials',
            'message': '基本設定（ドライブ・フォルダ情報）を確認しました。本接続にはGoogle Workspace連携またはサービスアカウント認可が必要です（現フェーズでは未接続）。'
        }

    def can_enable(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        dn = str(settings.get('drive_name', '')).strip()
        tf = str(settings.get('target_folder', '')).strip()
        if not dn and not tf:
            return False, '共有ドライブ名または対象フォルダが未設定です。基本設定を保存してから有効化してください。'
        return True, ''
