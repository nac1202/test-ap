"""AI Provider 共通インターフェース。

ルーターから AI 呼び出しを分離し、将来 Azure OpenAI など別 Provider へ
差し替えやすくするための最小限の抽象化（エージェント基盤ではない）。
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional


# 会話履歴1件: {"role": "user" | "assistant", "content": str}
ConversationHistory = List[Dict[str, str]]


@dataclass
class AIReply:
    """Provider が返す回答と、実行ログ用の非機密メタ情報。"""

    answer: str
    provider: str
    model: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    latency_ms: Optional[int] = None


class AIProviderError(Exception):
    """Provider 呼び出し失敗。

    kind は秘密情報を含まない分類名のみ（ログ・実行ログに保存してよい値）:
      api_key_missing / timeout / rate_limit / server_error / connection_error /
      auth_error / bad_request / invalid_response / unexpected
    元例外のメッセージには API キー断片が含まれ得るため、保持・記録しない。
    """

    def __init__(self, kind: str, status_code: Optional[int] = None):
        super().__init__(kind)
        self.kind = kind
        self.status_code = status_code


class AIProvider(ABC):
    name: str = "base"

    @abstractmethod
    def generate_reply(
        self,
        question: str,
        conversation_history: ConversationHistory,
        user_context: Optional[dict] = None,
    ) -> AIReply:
        """質問に対する回答を返す。失敗時は AIProviderError を送出する。"""
        raise NotImplementedError
