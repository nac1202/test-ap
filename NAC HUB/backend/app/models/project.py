from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    producer_id = Column(Integer, index=True)
    progress_rate = Column(Float, default=0.0)
    deadline = Column(DateTime(timezone=True))
    status = Column(String, default="normal") # normal, warning, delayed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, primary_key=True)
    role = Column(String, default="member")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProjectTimeline(Base):
    __tablename__ = "project_timelines"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, nullable=True)
    event_type = Column(String, nullable=False)
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RecentProject(Base):
    __tablename__ = "recent_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
