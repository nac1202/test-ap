"""Provider 選択とフォールバック制御。

AI_PROVIDER:
  mock   -> MockProvider（従来回答）
  openai -> OpenAIProvider。APIキー未設定・接続エラー・タイムアウト・429・5xx・不正レスポンス
            の場合は MockProvider へフォールバックする（再試行は SDK の max_retries のみ）。
"""
import logging
from dataclasses import dataclass
from typing import Optional

from app.core.config import settings
from app.services.ai.base import (
    AIProvider,
    AIProviderError,
    AIReply,
    ConversationHistory,
)
from app.services.ai.mock_provider import MockProvider
from app.services.ai.openai_provider import OpenAIProvider, is_openai_available

logger = logging.getLogger(__name__)

MODE_MOCK = "mock"          # モック回答モード
MODE_EXTERNAL = "external"  # 外部AI回答モード
MODE_FALLBACK = "fallback"  # 外部AI失敗によりモックへ一時切替

FALLBACK_WARNING = (
    "外部AIへ接続できなかったため、一時的に簡易回答モードで回答しています。"
)


def requested_provider_name() -> str:
    name = (settings.AI_PROVIDER or "mock").strip().lower()
    return name if name in ("mock", "openai") else "mock"


def get_provider(name: Optional[str] = None) -> AIProvider:
    """Provider を返す。将来 Azure OpenAI 等はここへ追加する。"""
    name = name or requested_provider_name()
    if name == "openai":
        return OpenAIProvider()
    return MockProvider()


def get_ai_status() -> dict:
    """外部通信なしで現在の回答モードを返す（フロント表示用）。"""
    if requested_provider_name() == "openai" and is_openai_available():
        return {"mode": MODE_EXTERNAL}
    if requested_provider_name() == "openai":
        return {"mode": MODE_FALLBACK, "warning": FALLBACK_WARNING}
    return {"mode": MODE_MOCK}


@dataclass
class ChatOutcome:
    reply: AIReply
    mode: str
    fallback_used: bool
    warning: Optional[str] = None
    error_kind: Optional[str] = None
    requested_provider: str = "mock"


def generate_reply_with_fallback(
    question: str,
    conversation_history: ConversationHistory,
    user_context: Optional[dict] = None,
) -> ChatOutcome:
    requested = requested_provider_name()

    if requested == "mock":
        reply = MockProvider().generate_reply(question, conversation_history, user_context)
        return ChatOutcome(reply=reply, mode=MODE_MOCK, fallback_used=False,
                           requested_provider=requested)

    # requested == "openai"
    try:
        reply = get_provider("openai").generate_reply(question, conversation_history, user_context)
        return ChatOutcome(reply=reply, mode=MODE_EXTERNAL, fallback_used=False,
                           requested_provider=requested)
    except AIProviderError as err:
        kind = err.kind
    except Exception as exc:  # noqa: BLE001 - 想定外でもチャットは落とさない
        logger.warning("Unexpected AI provider failure: exc_type=%s", type(exc).__name__)
        kind = "unexpected"

    logger.warning("AI fallback to mock: kind=%s", kind)
    reply = MockProvider().generate_reply(question, conversation_history, user_context)
    return ChatOutcome(
        reply=reply,
        mode=MODE_FALLBACK,
        fallback_used=True,
        warning=FALLBACK_WARNING,
        error_kind=kind,
        requested_provider=requested,
    )
