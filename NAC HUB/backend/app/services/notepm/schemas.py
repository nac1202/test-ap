"""NotePM 連携で使う最小限のデータ型。

NotePM の API レスポンス全文は保持せず、必要な項目だけを取り出す
（ユーザーコード・メール・グループ・参加ユーザー一覧などは取り込まない）。
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class AccountInfo:
    """トークンの権限（user/account の token.read_flag / write_flag）。"""
    read_flag: bool
    write_flag: bool


@dataclass
class NoteInfo:
    """アクセス可能なノート（管理画面でのホワイトリスト選択用）。"""
    note_code: str            # 管理者向け設定内部でのみ使用。一般ユーザー画面へは出さない
    name: str
    description: str = ""
    scope: str = ""           # open | private（参考表示用）
    archived: bool = False


@dataclass
class PageHit:
    """ページ検索の1件（本文は呼び出し側で上限を適用する）。"""
    title: str
    body: str
    updated_at: Optional[str]
    note_code: str            # 許可ノート照合用。AI・一般ユーザーへは渡さない
