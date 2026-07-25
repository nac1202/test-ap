from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class AIPrompt(Base):
    __tablename__ = "ai_prompts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    prompt_text = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

class AIChatHistory(Base):
    __tablename__ = "ai_chat_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AIExecutionLog(Base):
    __tablename__ = "ai_execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, index=True, nullable=False)
    used_plugins = Column(JSON, default=list)
    used_data = Column(String)
    process_details = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
