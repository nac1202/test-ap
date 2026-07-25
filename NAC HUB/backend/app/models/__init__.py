from app.models.company import Company
from app.models.role import Role
from app.models.user import User
from app.models.setting import TenantSetting, PluginConfig
from app.models.project import Project, ProjectMember, ProjectTimeline, RecentProject
from app.models.ai import AIPrompt, AIChatHistory, AIExecutionLog
from app.models.notification import Notification
from app.models.favorite import UserFavorite
from app.models.workflow import Workflow
from app.models.audit import AuditLog

# This ensures all models are imported and registered with SQLAlchemy Base
__all__ = [
    "Company",
    "Role",
    "User",
    "TenantSetting",
    "PluginConfig",
    "Project",
    "ProjectMember",
    "ProjectTimeline",
    "RecentProject",
    "AIPrompt",
    "AIChatHistory",
    "AIExecutionLog",
    "Notification",
    "UserFavorite",
    "Workflow",
    "AuditLog"
]
