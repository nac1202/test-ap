"""モック Provider（外部AIを呼ばない簡易回答）。

既存のモック回答ロジックをそのまま移設したもの。
"""
from typing import Optional

from app.services.ai.base import AIProvider, AIReply, ConversationHistory


def generate_mock_response(question: str) -> str:
    """質問内容に応じたモック回答を返す。"""
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


class MockProvider(AIProvider):
    name = "mock"

    def generate_reply(
        self,
        question: str,
        conversation_history: ConversationHistory,
        user_context: Optional[dict] = None,
    ) -> AIReply:
        ctx = user_context or {}
        internal_text = ctx.get("internal_context_text")
        if internal_text:
            if ctx.get("internal_no_match"):
                label = ctx.get("internal_label") or "情報"
                return AIReply(answer=f"{label}を確認しましたが、{internal_text}。", provider=self.name)
            label = ctx.get("internal_label") or "情報"
            return AIReply(
                answer=f"NAC HUB内の{label}を確認しました。\n\n{internal_text}",
                provider=self.name,
            )
        return AIReply(answer=generate_mock_response(question), provider=self.name)
