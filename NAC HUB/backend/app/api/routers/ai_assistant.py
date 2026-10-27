"""
AI Assistant API Router
- Internal name: ai_assistant (generic name for extensibility)
- Display name: "なっくん" (frontend only)
- AI 呼び出しは app.services.ai（Provider層）へ分離。AI_PROVIDER=mock で従来のモック回答、
  AI_PROVIDER=openai で OpenAI Responses API（失敗時はモックへフォールバック）。
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
from app.services.ai.factory import (
    generate_reply_with_fallback,
    get_ai_status,
    requested_provider_name,
)
from app.services.ai.history import build_conversation_history, redact_secrets
from app.services.ai.internal_context import (
    InternalContext,
    NacHubContextService,
    render_context_block,
)
from app.services.notepm.search import (
    CT_SEARCH as NOTEPM_CT_SEARCH,
    detect_notepm_intent,
    search_notepm,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ReferenceItem(BaseModel):
    """回答根拠（内部IDは含めない。link は案件詳細画面のパスのみ）。"""
    type: str            # project | notice | notepm
    title: str
    link: Optional[str] = None


class ChatResponse(BaseModel):
    id: int
    question: str
    answer: str
    created_at: datetime
    # 以下は後方互換の追加項目（技術詳細をフロントで目立たせない）
    mode: str = "mock"            # mock | external | fallback
    provider: str = "mock"        # 実際に回答した provider
    fallback_used: bool = False
    warning: Optional[str] = None
    # NAC HUB内部データ検索（第1弾）
    used_internal_data: bool = False
    references: list[ReferenceItem] = []
    context_type: Optional[str] = None
    # NotePM検索（読み取り専用・許可ノートのみ）: 実データを回答へ使った場合のみ True
    used_notepm_data: bool = False


class ChatHistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    created_at: datetime


def _build_process_details(outcome, ctx: Optional[InternalContext] = None) -> str:
    """実行ログ用の非機密メタ情報。APIキー・Authorization・プロンプト全文は含めない。

    モック単独は従来どおり "mock_response"。
    input_usage / output_usage は入出力トークン数（キー名に秘密情報スキャンの禁止語を含めないためこの名称）。
    内部データ検索を行った場合のみ、使用有無・分類・参照件数を追記する（取得内容そのものは保存しない）。
    """
    r = outcome.reply
    if outcome.mode == "mock":
        return "mock_response"
    parts = []
    if outcome.fallback_used:
        parts.append("mock_response")
    parts += [
        f"requested={outcome.requested_provider}",
        f"provider={r.provider}",
        f"model={r.model or '-'}",
        f"success={'false' if outcome.fallback_used else 'true'}",
        f"fallback={'true' if outcome.fallback_used else 'false'}",
        f"error={outcome.error_kind or 'none'}",
        f"latency_ms={r.latency_ms if r.latency_ms is not None else '-'}",
        f"input_usage={r.input_tokens if r.input_tokens is not None else '-'}",
        f"output_usage={r.output_tokens if r.output_tokens is not None else '-'}",
    ]
    if ctx is not None and ctx.used:
        if ctx.source == "notepm":
            parts += [
                "notepm=true",
                f"context_type={ctx.context_type}",
                f"ref_count={len(ctx.references)}",
            ]
        else:
            parts += [
                "internal_data=true",
                f"context_type={ctx.context_type}",
                f"ref_count={len(ctx.references)}",
            ]
    return ";".join(parts)


@router.get("/status")
def get_chat_status(current_user: User = Depends(get_current_active_user)):
    """現在の回答モード（外部通信なしで判定）。モデル名・キー等の技術情報は返さない。"""
    return get_ai_status()


@router.post("/chat", response_model=ChatResponse)
def send_chat_message(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a chat message and receive an AI response (mock / external AI).

    - Saves the Q&A pair to ai_chat_histories
    - Logs the execution to ai_execution_logs (no secrets)
    """
    # モデルへ渡す会話履歴は現在ユーザー本人の直近分のみ（上限あり・秘密情報らしき値を除外）
    history = build_conversation_history(db, current_user.id)
    safe_question = redact_secrets(data.question)

    # NAC HUB内部データ検索（バックエンドの固定ルールのみ。AIにSQL/DB権限は与えない）。
    # 純粋なモックモードでは従来動作を維持するため検索しない。
    ctx = InternalContext()
    if requested_provider_name() != "mock":
        try:
            notepm_keyword = detect_notepm_intent(safe_question)
            if notepm_keyword is not None:
                # NotePM検索意図がある質問のみ実API検索（許可ノートのホワイトリスト範囲）。
                # NotePMが利用できない状態（無効・未設定）は None → 一般質問として外部AIへ（未接続を正直に回答）。
                np_ctx = search_notepm(db, current_user.company_id, notepm_keyword)
                ctx = np_ctx if np_ctx is not None else InternalContext()
            else:
                ctx = NacHubContextService(db, current_user).build_context(safe_question)
        except Exception as exc:  # noqa: BLE001 - 内部検索の失敗でチャットは落とさない
            db.rollback()
            logger.warning("Internal context failed: exc_type=%s", type(exc).__name__)
            ctx = InternalContext()

    user_context = {"is_admin": bool(getattr(current_user, "is_admin", False))}
    if ctx.used:
        user_context.update({
            "internal_context_block": render_context_block(ctx),
            "internal_context_text": ctx.text,
            "internal_label": ctx.label,
            "internal_no_match": ctx.no_match,
            "internal_source": ctx.source,
        })
    outcome = generate_reply_with_fallback(safe_question, history, user_context)
    answer = outcome.reply.answer

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
        used_data=f"{ctx.source}:{ctx.context_type}" if ctx.used else "none",
        process_details=_build_process_details(outcome, ctx),
    )
    db.add(execution_log)
    db.commit()
    db.refresh(chat_record)

    logger.info(
        "AI chat processed: user_id=%s, chat_id=%s, mode=%s, provider=%s, fallback=%s, error=%s",
        current_user.id,
        chat_record.id,
        outcome.mode,
        outcome.reply.provider,
        outcome.fallback_used,
        outcome.error_kind or "none",
    )

    return ChatResponse(
        id=chat_record.id,
        question=chat_record.question,
        answer=chat_record.answer,
        created_at=chat_record.created_at,
        mode=outcome.mode,
        provider=outcome.reply.provider,
        fallback_used=outcome.fallback_used,
        warning=outcome.warning,
        used_internal_data=ctx.used and ctx.source == "nac_hub",
        references=[ReferenceItem(**r.as_dict()) for r in ctx.references],
        context_type=ctx.context_type if ctx.used else None,
        used_notepm_data=bool(ctx.used and ctx.source == "notepm" and ctx.context_type == NOTEPM_CT_SEARCH),
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
