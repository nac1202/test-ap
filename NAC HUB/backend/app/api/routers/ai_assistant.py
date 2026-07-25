"""
AI Assistant API Router
- Internal name: ai_assistant (generic name for extensibility)
- Display name: "なっくん" (frontend only)
- This phase uses mock responses; no external AI API is called.
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.database import get_db
from app.models.ai import AIChatHistory, AIExecutionLog
from app.models.audit import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    id: int
    question: str
    answer: str
    created_at: datetime


class ChatHistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Mock response logic
# ---------------------------------------------------------------------------

def _generate_mock_response(question: str) -> str:
    """Generate a mock response based on question content.

    In a future phase this will be replaced with a real AI backend call.
    """
    q_lower = question.lower()

    if "案件" in question:
        return (
            "現在はモックデータで回答しています。"
            "案件管理API接続後、実際の案件情報を確認できるようになります。\n\n"
            "接続予定の機能:\n"
            "・案件一覧の取得\n"
            "・案件ステータスの確認\n"
            "・担当者情報の表示"
        )

    if "予定" in question or "スケジュール" in question or "カレンダー" in question:
        return (
            "現在はモックデータで回答しています。"
            "Google Calendar連携後、実際の予定情報を確認できるようになります。"
        )

    if "slack" in q_lower or "スラック" in question:
        return (
            "現在はモックデータで回答しています。"
            "Slackプラグイン接続後、チャンネルの検索や過去ログの参照が可能になります。"
        )

    if "notePM" in q_lower or "notepm" in q_lower or "ノート" in question:
        return (
            "現在はモックデータで回答しています。"
            "NotePMプラグイン接続後、社内ナレッジの検索が可能になります。"
        )

    if "ドライブ" in question or "drive" in q_lower or "資料" in question or "ファイル" in question:
        return (
            "現在はモックデータで回答しています。"
            "Google Driveプラグイン接続後、ファイルの検索・参照が可能になります。"
        )

    return (
        "ご質問ありがとうございます！\n\n"
        "現在はモック回答モードで動作しています。"
        "今後、外部AIおよび各プラグイン（Slack・NotePM・Google Drive等）と接続することで、"
        "より正確な回答が可能になります。\n\n"
        "何かお手伝いできることがあれば、お気軽にお聞きください。"
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
def send_chat_message(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a chat message and receive a mock AI response.

    - Saves the Q&A pair to ai_chat_histories
    - Logs the execution to ai_execution_logs (no secrets)
    """
    answer = _generate_mock_response(data.question)

    # Save to chat history
    chat_record = AIChatHistory(
        user_id=current_user.id,
        question=data.question,
        answer=answer,
    )
    db.add(chat_record)
    db.flush()  # Get the auto-generated id

    # Save execution log (never include passwords, tokens, or API keys)
    execution_log = AIExecutionLog(
        chat_id=chat_record.id,
        used_plugins=[],
        used_data="none",
        process_details="mock_response",
    )
    db.add(execution_log)
    db.commit()
    db.refresh(chat_record)

    logger.info(
        "AI chat processed: user_id=%s, chat_id=%s, mode=mock",
        current_user.id,
        chat_record.id,
    )

    return ChatResponse(
        id=chat_record.id,
        question=chat_record.question,
        answer=chat_record.answer,
        created_at=chat_record.created_at,
    )


@router.get("/history", response_model=list[ChatHistoryItem])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the current user's chat history (most recent first, max 100)."""
    records = (
        db.query(AIChatHistory)
        .filter(AIChatHistory.user_id == current_user.id)
        .order_by(AIChatHistory.created_at.desc())
        .limit(100)
        .all()
    )
    # Return in chronological order for display
    records.reverse()
    return [
        ChatHistoryItem(
            id=r.id,
            question=r.question,
            answer=r.answer,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.delete("/history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Clear the current user's chat history (start a new conversation).

    - Only deletes the current user's records
    - Records audit log (no secrets)
    """
    deleted_count = (
        db.query(AIChatHistory)
        .filter(AIChatHistory.user_id == current_user.id)
        .delete()
    )

    # Audit log (no sensitive information)
    db.add(AuditLog(
        user_id=current_user.id,
        action="ai_chat_history_cleared",
        details={"deleted_count": deleted_count},
    ))
    db.commit()

    logger.info(
        "AI chat history cleared: user_id=%s, deleted_count=%s",
        current_user.id,
        deleted_count,
    )

    return {"detail": "チャット履歴をクリアしました。", "deleted_count": deleted_count}
