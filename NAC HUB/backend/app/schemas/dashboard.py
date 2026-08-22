from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ProjectSummarySchema(BaseModel):
    total: int = 0
    normal: int = 0
    warning: int = 0
    delayed: int = 0
    due_soon: int = 0

class RecentProjectSchema(BaseModel):
    id: int
    name: str
    status: str
    progress_rate: float
    deadline: Optional[datetime] = None
    viewed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationSchema(BaseModel):
    id: int
    title: str
    content: Optional[str] = None
    category: str = "general"
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TaskSchema(BaseModel):
    id: int
    title: str
    status: str
    due_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class IntegrationsSchema(BaseModel):
    weather: bool = False
    hotbiz: bool = False
    slack: bool = False
    notepm: bool = False
    google_drive: bool = False

class NoticeSchema(BaseModel):
    id: int
    title: str
    content: Optional[str] = None
    category: str = "general"
    is_important: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DashboardResponse(BaseModel):
    generated_at: datetime
    project_summary: ProjectSummarySchema
    recent_projects: List[RecentProjectSchema]
    notifications: List[NotificationSchema]
    notices: List[NoticeSchema] = []
    tasks: List[TaskSchema]
    integrations: IntegrationsSchema
