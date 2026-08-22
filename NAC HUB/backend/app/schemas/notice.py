from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class NoticeBase(BaseModel):
    title: str
    body: str
    category: str = "全社"
    is_important: bool = False
    is_active: bool = True

class NoticeCreate(NoticeBase):
    pass

class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    is_important: Optional[bool] = None
    is_active: Optional[bool] = None

class NoticeResponse(NoticeBase):
    id: int
    company_id: int
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class NoticeList(BaseModel):
    total: int
    items: list[NoticeResponse]
