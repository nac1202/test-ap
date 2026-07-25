from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

# --- Member Schemas ---
class ProjectMemberBase(BaseModel):
    user_id: int
    role: str = Field(default="member", description="Role in project (e.g. producer, leader, member)")

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMemberResponse(ProjectMemberBase):
    project_id: int
    user_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Timeline Schemas ---
class ProjectTimelineBase(BaseModel):
    event_type: str = Field(..., description="Event type (e.g. status_change, note, milestone)")
    content: Optional[str] = None

class ProjectTimelineCreate(ProjectTimelineBase):
    pass

class ProjectTimelineResponse(ProjectTimelineBase):
    id: int
    project_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    producer_id: Optional[int] = Field(default=None, description="Producer user ID")
    progress_rate: float = Field(default=0.0, ge=0.0, le=100.0, description="Progress percentage (0.0 to 100.0)")
    deadline: Optional[datetime] = Field(default=None, description="Project deadline")
    status: str = Field(default="normal", description="Status: normal, warning, delayed")

class ProjectCreate(ProjectBase):
    member_user_ids: Optional[List[int]] = Field(default_factory=list, description="Initial member user IDs")

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    producer_id: Optional[int] = None
    progress_rate: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    deadline: Optional[datetime] = None
    status: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    producer_name: Optional[str] = None
    member_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ProjectDetailResponse(ProjectResponse):
    members: List[ProjectMemberResponse] = []
    timelines: List[ProjectTimelineResponse] = []

class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
    page: int
    size: int
