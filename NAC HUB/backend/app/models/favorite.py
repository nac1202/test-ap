from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class UserFavorite(Base):
    __tablename__ = "user_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    target_type = Column(String, nullable=False) # e.g., project, notepm
    target_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
