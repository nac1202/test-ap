"""OpenAI Provider（公式SDK / Responses API でテキスト応答を取得）。

- API キーはバックエンドの設定（環境変数 OPENAI_API_KEY）からのみ取得する。
- 失敗時は AIProviderError(kind) のみ送出する。元例外のメッセージには
  キー断片が含まれ得るため、ログ・実行ログへは種別とステータスコードだけを残す。
- 外部検索・ファイル検索・ツール呼び出しは使用しない。
"""
import logging
import time
from typing import Optional

import openai

from app.core.config import settings
from app.services.ai.base import (
    AIProvider,
    AIProviderError,
    AIReply,
    ConversationHistory,
)
from app.services.ai.instructions import NAKKUN_INSTRUCTIONS

logger = logging.getLogger(__name__)


def get_api_key() -> Optional[str]:
    """設定から API キーを取り出す。未設定・空文字なら None。"""
    secret = settings.OPENAI_API_KEY
    if secret is None:
        return None
    value = secret.get_secret_value().strip()
    return value or None


def is_openai_available() -> bool:
    return bool(get_api_key())


def _build_client():
    """SDK クライアントを生成する（テストではこの関数を差し替える）。"""
    return openai.OpenAI(
        api_key=get_api_key(),
        timeout=settings.OPENAI_TIMEOUT_SECONDS,
        max_retries=max(0, settings.OPENAI_MAX_RETRIES),
    )


def classify_error(exc: Exception) -> AIProviderError:
    """SDK 例外を、秘密情報を含まない AIProviderError へ変換する。"""
    if isinstance(exc, AIProviderError):
        return exc
    if isinstance(exc, openai.APITimeoutError):
        return AIProviderError("timeout")
    if isinstance(exc, openai.APIConnectionError):
        return AIProviderError("connection_error")
    if isinstance(exc, openai.APIStatusError):
        code = getattr(exc, "status_code", None)
        if code == 429:
            return AIProviderError("rate_limit", code)
        if code in (401, 403):
            return AIProviderError("auth_error", code)
        if code is not None and code >= 500:
            return AIProviderError("server_error", code)
        return AIProviderError("bad_request", code)
    return AIProviderError("unexpected")


class OpenAIProvider(AIProvider):
    name = "openai"

    def generate_reply(
        self,
        question: str,
        conversation_history: ConversationHistory,
        user_context: Optional[dict] = None,
    ) -> AIReply:
        if not is_openai_available():
            raise AIProviderError("api_key_missing")

        model = settings.OPENAI_MODEL
        messages = list(conversation_history) + [{"role": "user", "content": question}]
        kwargs = {
            "model": model,
            "instructions": NAKKUN_INSTRUCTIONS,
            "input": messages,
            "max_output_tokens": settings.OPENAI_MAX_OUTPUT_TOKENS,
            "store": False,  # OpenAI側へ会話を保存しない
        }
        effort = (settings.OPENAI_REASONING_EFFORT or "").strip()
        if effort:
            kwargs["reasoning"] = {"effort": effort}

        started = time.monotonic()
        try:
            client = _build_client()
            response = client.responses.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 - 種別のみ記録して再送出
            err = classify_error(exc)
            logger.warning(
                "OpenAI call failed: kind=%s status=%s exc_type=%s",
                err.kind, err.status_code, type(exc).__name__,
            )
            raise err from None

        latency_ms = int((time.monotonic() - started) * 1000)

        text = getattr(response, "output_text", None)
        if not isinstance(text, str) or not text.strip():
            logger.warning("OpenAI returned empty/invalid response")
            raise AIProviderError("invalid_response")

        usage = getattr(response, "usage", None)
        in_tokens = getattr(usage, "input_tokens", None)
        out_tokens = getattr(usage, "output_tokens", None)
        return AIReply(
            answer=text.strip(),
            provider=self.name,
            model=model,
            input_tokens=in_tokens if isinstance(in_tokens, int) else None,
            output_tokens=out_tokens if isinstance(out_tokens, int) else None,
            latency_ms=latency_ms,
        )
