from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class NotificationBase(BaseModel):
    title: str
    body: Optional[str] = None
    type: str

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationList(BaseModel):
    total: int
    items: list[NotificationResponse]

class NotificationUnreadCount(BaseModel):
    unread_count: int
