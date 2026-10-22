"""監査ログ検索（日本語対応）

画面に表示される日本語の操作名・業務用語で監査ログを検索できるようにする。
DB上の action 値は変更せず、検索語を内部 action（または action パターン）へ
マッピングして SQL 側で絞り込む（ページネーション全体が正しく検索される）。

- 日本語検索語と内部 action の対応は AUDIT_SEARCH_ALIASES に一元管理する。
- プラグイン系 action は plugins.py の実装（"{表示名}設定変更" 等）に合わせ、
  プラグイン定義レジストリから自動生成する。
- details は秘密情報を含まない安全なキーだけを検索対象にする。
"""
from typing import Dict, List, Optional

from sqlalchemy import and_, cast, func, literal_column, or_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User
from app.services.plugins.registry import get_all_adapters

# ---------------------------------------------------------------------------
# 日本語検索語 → 内部action 対応表（一元管理）
#   actions     : action の完全一致リスト
#   like        : action の部分一致パターン（先頭一致等。% 付き）
#   details_any : （任意）actions と AND で適用する、安全な details 内文字列条件
# 実在するactionのみ登録する（コード上の AuditLog 書き込み箇所を確認済み）。
# DELETE_NOTICE / enable_user / disable_user は現行コードから発行されないため登録しない
# （お知らせ削除・ユーザー有効化/無効化は、実装時に対応表へ追加すること）。
# ---------------------------------------------------------------------------
AUDIT_SEARCH_ALIASES: Dict[str, Dict[str, List[str]]] = {
    # お知らせ
    "お知らせ": {"actions": ["CREATE_NOTICE", "UPDATE_NOTICE"]},
    "お知らせ作成": {"actions": ["CREATE_NOTICE"]},
    "お知らせ更新": {"actions": ["UPDATE_NOTICE"]},
    # システム設定
    "システム設定": {"actions": ["システム設定変更"]},
    "システム設定変更": {"actions": ["システム設定変更"]},
    "メンテナンス": {"actions": ["システム設定変更"], "details_any": ["メンテナンス"]},
    # ユーザー
    "ユーザー": {"actions": ["create_user", "update_user", "update_role"]},
    "ユーザー作成": {"actions": ["create_user"]},
    "ユーザー更新": {"actions": ["update_user"]},
    "利用区分変更": {"actions": ["update_role"]},
    # 案件
    "案件": {"actions": [
        "create_project", "update_project", "delete_project",
        "add_project_member", "remove_project_member",
    ]},
    "案件作成": {"actions": ["create_project"]},
    "案件更新": {"actions": ["update_project"]},
    "案件削除": {"actions": ["delete_project"]},
    "メンバー追加": {"actions": ["add_project_member"]},
    "メンバー削除": {"actions": ["remove_project_member"]},
    # ログイン
    "ログイン": {"actions": ["login_success", "login_failed"]},
    "ログイン成功": {"actions": ["login_success"]},
    "ログイン失敗": {"actions": ["login_failed"]},
    "ログアウト": {"actions": ["logout"]},
    # パスワード
    "パスワード変更": {"actions": ["change_password", "change_password_failed"]},
    # その他
    "AIチャット履歴削除": {"actions": ["ai_chat_history_cleared"]},
    "管理者初期作成": {"actions": ["create_initial_admin"]},
    "管理者パスワードリセット": {"actions": ["reset_initial_admin"]},
}


def _build_plugin_aliases() -> Dict[str, Dict[str, List[str]]]:
    """プラグイン定義から検索エイリアスを自動生成する（plugins.py のaction文言に一致）"""
    aliases: Dict[str, Dict[str, List[str]]] = {}
    all_patterns: List[str] = []
    for ad in get_all_adapters():
        name = ad.display_name
        aliases[name] = {"like": [f"{name}%"]}
        aliases[f"{name}設定変更"] = {"actions": [f"{name}設定変更"]}
        aliases[f"{name}設定確認"] = {"actions": [f"{name}設定確認"]}
        aliases[f"{name}有効化"] = {"actions": [f"{name}を有効化"]}
        aliases[f"{name}無効化"] = {"actions": [f"{name}を無効化"]}
        all_patterns.append(f"{name}%")
    aliases["プラグイン"] = {"like": all_patterns}
    return aliases


def get_all_aliases() -> Dict[str, Dict[str, List[str]]]:
    merged = dict(AUDIT_SEARCH_ALIASES)
    merged.update(_build_plugin_aliases())
    return merged


# details 内で検索対象にする「安全な」キー（秘密情報・内部IDは含めない）
SAFE_DETAIL_KEYS = [
    "entity_name",        # お知らせ名
    "name",               # 案件名
    "project_name",
    "target_project_name",
    "target_email",       # 対象メール
    "created_email",
    "email",
    "service",            # 対象サービス
    "operation",          # 操作
    "executed_by",        # 実行者
    "category",           # カテゴリ
    "summary",            # 変更内容（要約）
    "changes",            # 変更内容（案件等）
    "system_name",
    "company_name",
]


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _details_contains(term: str):
    """安全なdetailsキー内に term を含むか（jsonb経由で日本語を正しく比較）"""
    pat = f"%{_escape_like(term)}%"
    jb = cast(AuditLog.details, JSONB)
    conds = [jb[key].astext.ilike(pat, escape="\\") for key in SAFE_DETAIL_KEYS]
    # 旧形式（detailsが文字列スカラー）のログも検索可能にする
    conds.append(and_(
        func.jsonb_typeof(jb) == "string",
        jb.op("#>>")(literal_column("'{}'")).ilike(pat, escape="\\"),
    ))
    return or_(*conds)


def build_audit_search_filter(db: Session, term: str, company_id: Optional[int]):
    """検索語から WHERE 条件を生成する。term は strip 済みを想定。"""
    term = term.strip()
    if not term:
        return None
    pat = f"%{_escape_like(term)}%"
    conds = []

    # 1) 従来どおり: 内部action名の部分一致（大文字小文字無視）
    conds.append(AuditLog.action.ilike(pat, escape="\\"))

    # 2) 日本語エイリアス（検索語を含むエイリアス名すべてを対象＝部分一致）
    term_cf = term.casefold()
    for alias, spec in get_all_aliases().items():
        if term_cf not in alias.casefold():
            continue
        action_cond = None
        actions = spec.get("actions") or []
        likes = spec.get("like") or []
        parts = []
        if actions:
            parts.append(AuditLog.action.in_(actions))
        for lk in likes:
            parts.append(AuditLog.action.ilike(lk, escape="\\"))
        if parts:
            action_cond = or_(*parts)
        details_any = spec.get("details_any") or []
        if action_cond is not None and details_any:
            action_cond = and_(action_cond, or_(*[_details_contains(d) for d in details_any]))
        if action_cond is not None:
            conds.append(action_cond)

    # 3) 安全な details 内文字列（お知らせ名・案件名・対象サービス・実行者 等）
    conds.append(_details_contains(term))

    # 4) 実行ユーザーのメールアドレス・氏名（自社ユーザーのみ）
    user_q = db.query(User.id)
    if company_id is not None:
        user_q = user_q.filter(User.company_id == company_id)
    full_name = func.concat(User.last_name, " ", User.first_name)
    full_name2 = func.concat(User.last_name, User.first_name)
    matched_ids = [
        r[0] for r in user_q.filter(or_(
            User.email.ilike(pat, escape="\\"),
            User.first_name.ilike(pat, escape="\\"),
            User.last_name.ilike(pat, escape="\\"),
            full_name.ilike(pat, escape="\\"),
            full_name2.ilike(pat, escape="\\"),
        )).all()
    ]
    if matched_ids:
        conds.append(AuditLog.user_id.in_(matched_ids))

    return or_(*conds)
