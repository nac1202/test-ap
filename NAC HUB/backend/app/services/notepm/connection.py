"""NotePM 実API接続確認（プラグイン管理の「設定確認」から呼ばれる）。

GET /api/v1/user/account のみを使用する。ユーザー名・メールアドレスは取り込まず、
トークンの権限（read_flag / write_flag）だけを確認する。
"""
from typing import Any, Dict, List

from app.services.notepm.client import NotePMClient, NotePMError, normalize_team_domain, get_token

READ_ONLY_WARNING = (
    "読み取り専用トークンの利用を推奨します。"
    "このトークンには書き込み権限が付与されています（NAC HUBは読み取りのみ使用し、書き込みは行いません）。"
)


def check_connection(team_domain: str) -> Dict[str, Any]:
    """接続確認を実行し、success / status / message / warnings を返す（秘密情報は含めない）。"""
    td = (team_domain or "").strip()
    if not td:
        return _result(False, "not_configured", NotePMError("domain_missing").message)
    try:
        host = normalize_team_domain(td)
    except NotePMError as err:
        return _result(False, "error", err.message)
    if not get_token():
        return _result(False, "needs_credentials", NotePMError("token_missing").message)

    try:
        account = NotePMClient(host).get_account()
    except NotePMError as err:
        return _result(False, "connection_error", err.message)

    if not account.read_flag:
        return _result(False, "connection_error",
                       "このトークンには読み取り権限がありません。読み取り権限のあるトークンを設定してください。")

    warnings: List[str] = []
    if account.write_flag:
        warnings.append(READ_ONLY_WARNING)
    return _result(True, "connected",
                   "NotePMへ接続できました。読み取り権限を確認しました。", warnings)


def _result(success: bool, status: str, message: str, warnings: List[str] = None) -> Dict[str, Any]:
    return {"success": success, "status": status, "message": message, "warnings": warnings or []}
