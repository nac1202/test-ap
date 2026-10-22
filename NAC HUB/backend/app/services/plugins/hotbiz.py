from typing import Dict, Any, Tuple, List
from app.services.plugins.base import BasePluginAdapter

VALID_HOTBIZ_METHODS = {'link', 'gcal', 'csv', 'vendor'}
VALID_HOTBIZ_FEATURES = {'schedule', 'attendance', 'facility'}

class HotBizPluginAdapter(BasePluginAdapter):
    plugin_key = 'hotbiz'
    display_name = 'HotBiz'
    category = 'グループウェア連携'
    description = '予定表・勤怠・設備予約等をNAC HUBへ連携するための設定です。利用可能な方式は契約・提供仕様により異なります。'

    def validate_settings(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        self.validate_non_sensitive(settings)
        method = settings.get('connection_method', '')
        if method and method not in VALID_HOTBIZ_METHODS:
            return False, f'不正な連携方式です。有効な方式: {list(VALID_HOTBIZ_METHODS)}'
        features = settings.get('target_features', [])
        if features and isinstance(features, list):
            for f in features:
                if f not in VALID_HOTBIZ_FEATURES:
                    return False, f'不正な連携対象機能です: {f}'
        return True, ''

    def evaluate_status(self, is_active: bool, settings: Dict[str, Any]) -> str:
        if not is_active:
            return 'disabled'
        method = str(settings.get('connection_method', '')).strip()
        if not method:
            return 'not_configured'
        if method == 'link':
            return 'configured'
        return 'not_implemented'

    def check_configuration(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_non_sensitive(settings)
        method = str(settings.get('connection_method', '')).strip()
        if not method:
            return {
                'success': False,
                'status': 'not_configured',
                'message': '連携方式が選択されていません。基本設定を入力してください。'
            }
        
        messages = {
            'link': 'HotBizは現在、外部ポータルリンク方式として設定確認を完了しました。',
            'gcal': 'HotBizは現在、Googleカレンダー経由の準備情報まで設定済みです。実通信同期は今後対応予定です。',
            'csv': 'HotBizは現在、CSV取込連携の準備情報として設定確認を完了しました。自動取込機能は今後対応予定です。',
            'vendor': 'HotBizは現在、ベンダー個別連携方式の準備情報として設定確認を完了しました。専用API接続は今後対応予定です。'
        }
        status_map = {
            'link': 'configured',
            'gcal': 'not_implemented',
            'csv': 'not_implemented',
            'vendor': 'not_implemented'
        }
        return {
            'success': True,
            'status': status_map.get(method, 'configured'),
            'message': messages.get(method, 'HotBiz基本設定を確認しました。')
        }

    def can_enable(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        method = str(settings.get('connection_method', '')).strip()
        if not method:
            return False, '連携方式が未選択です。基本設定を保存してから有効化してください。'
        return True, ''
