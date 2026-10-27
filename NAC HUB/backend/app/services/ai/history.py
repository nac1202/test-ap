"""モデルへ渡す会話履歴の組み立てと、秘密情報らしき値の除外。

- 現在ユーザー本人の履歴のみ（ai_chat_histories は user_id で分離。ユーザーは1社所属のため
  他会社の履歴も混入しない）。
- 直近 AI_HISTORY_MAX_TURNS 往復 かつ 合計 AI_HISTORY_MAX_CHARS 文字までに制限。
- DB へ保存する内容は変更しない（モデルへ渡す内容だけ除外処理する）。
"""
import re
from typing import List

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai import AIChatHistory
from app.services.ai.base import ConversationHistory

REDACTED = "[秘密情報らしき値を除外]"

_SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),                       # OpenAI系キー
    re.compile(r"Bearer\s+[A-Za-z0-9._\-]{8,}", re.IGNORECASE),  # Authorization
    re.compile(r"eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]*"),  # JWT
    re.compile(
        r"(password|passwd|pwd|secret|token|api[_\- ]?key|authorization|パスワード|暗証番号|APIキー|トークン|シークレット)"
        r"\s*[:=：]\s*\S+",
        re.IGNORECASE,
    ),
    re.compile(r"postgres(?:ql)?://\S+", re.IGNORECASE),         # DATABASE_URL
]


def redact_secrets(text: str) -> str:
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub(REDACTED, text)
    return text


def build_conversation_history(db: Session, user_id: int) -> ConversationHistory:
    """現在ユーザーの直近会話を、上限内で時系列順の role/content 形式にして返す。"""
    max_turns = max(0, settings.AI_HISTORY_MAX_TURNS)
    max_chars = max(0, settings.AI_HISTORY_MAX_CHARS)
    if max_turns == 0 or max_chars == 0:
        return []

    records = (
        db.query(AIChatHistory)
        .filter(AIChatHistory.user_id == user_id)
        .order_by(AIChatHistory.id.desc())
        .limit(max_turns)
        .all()
    )  # 新しい順

    turns: List[ConversationHistory] = []
    total = 0
    for r in records:
        q = redact_secrets(r.question or "")
        a = redact_secrets(r.answer or "")
        size = len(q) + len(a)
        if total + size > max_chars:
            break  # 古い履歴から切り捨てる
        total += size
        turns.append([
            {"role": "user", "content": q},
            {"role": "assistant", "content": a},
        ])

    turns.reverse()  # 時系列順へ
    return [m for pair in turns for m in pair]
