from sqlalchemy import Column, Integer, String, JSON
from app.db.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    permissions = Column(JSON, default=dict) # e.g. {"projects": {"read": true, "write": true}}
