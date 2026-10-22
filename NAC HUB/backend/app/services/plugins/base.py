from typing import Dict, Any, Tuple, List, Optional
import re

FORBIDDEN_KEY_PATTERNS = [
    r'secret', r'token', r'password', r'passwd', r'key', r'credential',
    r'auth', r'cert', r'private', r'api[_-]?key', r'client[_-]?secret'
]

class BasePluginAdapter:
    plugin_key: str = ''
    display_name: str = ''
    category: str = ''
    description: str = ''
    
    def validate_non_sensitive(self, settings: Dict[str, Any]) -> None:
        if not isinstance(settings, dict):
            raise ValueError('設定データはオブジェクト形式である必要があります。')
        for k in settings.keys():
            k_lower = str(k).lower()
            for pat in FORBIDDEN_KEY_PATTERNS:
                if re.search(pat, k_lower):
                    raise ValueError(f'機密情報・資格情報キー（{k}）は保存できません。準備情報のみ入力してください。')

    def validate_settings(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        raise NotImplementedError

    def evaluate_status(self, is_active: bool, settings: Dict[str, Any]) -> str:
        raise NotImplementedError

    def check_configuration(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def can_enable(self, settings: Dict[str, Any]) -> Tuple[bool, str]:
        raise NotImplementedError
