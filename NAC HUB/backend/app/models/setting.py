from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class TenantSetting(Base):
    __tablename__ = "tenant_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    key = Column(String, index=True, nullable=False)
    value = Column(String)
    is_secret = Column(Boolean, default=False)

class PluginConfig(Base):
    __tablename__ = "plugin_configs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    plugin_name = Column(String, index=True, nullable=False)
    is_active = Column(Boolean, default=False)
    config_json = Column(JSON, default=dict)
    last_tested_at = Column(DateTime(timezone=True))
