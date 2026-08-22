from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    category = Column(String, nullable=False, default="全社")
    is_important = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(Integer, nullable=True) # ID of admin who created it
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
