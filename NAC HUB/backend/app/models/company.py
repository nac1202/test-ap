from sqlalchemy import Column, Integer, String, JSON
from app.db.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    phone = Column(String)
    logo_url = Column(String)
    theme_color = Column(String)
    timezone = Column(String, default="Asia/Tokyo")
    holidays = Column(JSON, default=list) # e.g. [{"date": "2026-01-01", "name": "New Year"}]
