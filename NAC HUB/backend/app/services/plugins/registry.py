from typing import Dict, List, Optional
from app.services.plugins.base import BasePluginAdapter
from app.services.plugins.slack import SlackPluginAdapter
from app.services.plugins.google_drive import GoogleDrivePluginAdapter
from app.services.plugins.notepm import NotePMPluginAdapter
from app.services.plugins.hotbiz import HotBizPluginAdapter

_ADAPTERS: Dict[str, BasePluginAdapter] = {
    'slack': SlackPluginAdapter(),
    'google_drive': GoogleDrivePluginAdapter(),
    'notepm': NotePMPluginAdapter(),
    'hotbiz': HotBizPluginAdapter(),
}

def get_plugin_adapter(plugin_key: str) -> Optional[BasePluginAdapter]:
    return _ADAPTERS.get(plugin_key)

def get_all_adapters() -> List[BasePluginAdapter]:
    return list(_ADAPTERS.values())

def is_supported_plugin(plugin_key: str) -> bool:
    return plugin_key in _ADAPTERS
