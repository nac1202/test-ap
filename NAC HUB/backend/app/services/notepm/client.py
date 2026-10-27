"""NotePM 読み取り専用 API クライアント。

安全方針:
- 使用する HTTP メソッドは GET のみ（POST / PATCH / DELETE は実装しない）。
- 接続先は https://{チーム}.notepm.jp/api/v1 のみ（SSRF 対策: HTTPS 固定・ホスト名は
  *.notepm.jp の単一ラベルのみ・localhost / IP 直指定 / ポート / ユーザー情報 / パス付き URL は拒否）。
- 認証トークンは settings（SecretStr）から取り出し、リクエストヘッダー生成の瞬間だけ使う。
  エラー・ログには値も Authorization ヘッダーも含めない（種別 NotePMError.kind のみ）。
- リダイレクトは追従しない。タイムアウトあり。リトライはしない（429 は即時に利用者へ案内）。
"""
import ipaddress
import json
import logging
import re
from typing import Callable, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from app.core.config import settings
from app.services.notepm.schemas import AccountInfo, NoteInfo, PageHit

logger = logging.getLogger(__name__)

NOTEPM_DOMAIN_SUFFIX = ".notepm.jp"
REQUEST_TIMEOUT_SECONDS = 10.0
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
NOTES_PER_PAGE = 50
NOTES_MAX_PAGES = 4            # 最大200ノートまで（無制限取得の禁止）

# 利用者向けメッセージ（トークン値・HTTP 詳細は含めない）
ERROR_MESSAGES: Dict[str, str] = {
    "rate_limit": "NotePMへのアクセスが一時的に混雑しています。少し時間を置いてお試しください。",
    "auth_error": "NotePMの認証情報を確認してください。",
    "unavailable": "NotePMへ一時的に接続できません。",
    "invalid_response": "NotePMから想定外の応答が返されました。",
    "token_missing": "NotePMの認証情報（APIトークン）が設定されていません。",
    "domain_missing": "NotePMのチームドメインが設定されていません。基本設定を入力してください。",
    "invalid_domain": "NotePMのチームドメインの形式が正しくありません（例: team-nac.notepm.jp）。",
    "blocked": "テスト環境からNotePMの実APIへは接続できません。",
}


class NotePMError(Exception):
    """NotePM 呼び出し失敗。kind は秘密情報を含まない分類名のみ。"""

    def __init__(self, kind: str, status_code: Optional[int] = None):
        super().__init__(kind)
        self.kind = kind
        self.status_code = status_code

    @property
    def message(self) -> str:
        return ERROR_MESSAGES.get(self.kind, ERROR_MESSAGES["unavailable"])


# ---------------------------------------------------------------------------
# チームドメインの正規化・SSRF 対策
# ---------------------------------------------------------------------------

_LABEL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?$")


def normalize_team_domain(raw: Optional[str]) -> str:
    """入力を `team-nac.notepm.jp` 形式のホスト名へ正規化する。不正なら NotePMError。

    許可: `team-nac.notepm.jp` / `https://team-nac.notepm.jp/` / `https://team-nac.notepm.jp/api/v1`
    拒否: http:// / localhost / IP 直指定 / 任意外部ドメイン / ポート・ユーザー情報 /
          想定外のパス・クエリ / 多段サブドメイン
    """
    text = (raw or "").strip()
    if not text:
        raise NotePMError("domain_missing")
    if len(text) > 200 or any(c in text for c in (" ", "\t", "\r", "\n", "\\")):
        raise NotePMError("invalid_domain")

    if "://" in text:
        parsed = urlparse(text)
        if parsed.scheme.lower() != "https":
            raise NotePMError("invalid_domain")
        netloc, path = parsed.netloc, parsed.path
        if parsed.query or parsed.fragment or parsed.params:
            raise NotePMError("invalid_domain")
    else:
        if "/" in text:
            head, _, tail = text.partition("/")
            netloc, path = head, "/" + tail
        else:
            netloc, path = text, ""

    if path not in ("", "/", "/api/v1", "/api/v1/"):
        raise NotePMError("invalid_domain")
    # ユーザー情報・ポートは拒否（"@" / ":" を含むもの）
    if "@" in netloc or ":" in netloc:
        raise NotePMError("invalid_domain")

    host = netloc.strip().rstrip(".").lower()
    if not host or host == "localhost":
        raise NotePMError("invalid_domain")
    try:
        ipaddress.ip_address(host)
        raise NotePMError("invalid_domain")      # IP アドレス直指定は禁止
    except ValueError:
        pass

    if "." not in host:
        host = host + NOTEPM_DOMAIN_SUFFIX     # "team-nac" → "team-nac.notepm.jp"（単一ラベルのみ補完）
    if not host.endswith(NOTEPM_DOMAIN_SUFFIX):
        raise NotePMError("invalid_domain")
    label = host[: -len(NOTEPM_DOMAIN_SUFFIX)]
    if not _LABEL_RE.match(label):               # 単一ラベルのみ（多段・空・記号を拒否）
        raise NotePMError("invalid_domain")
    return host


def build_base_url(team_host: str) -> str:
    return f"https://{team_host}/api/v1"


# ---------------------------------------------------------------------------
# トークン / HTTP 層
# ---------------------------------------------------------------------------

def get_token() -> Optional[str]:
    secret = settings.NOTEPM_API_TOKEN
    if secret is None:
        return None
    value = secret.get_secret_value().strip()
    return value or None


def is_token_configured() -> bool:
    """トークン設定有無（真偽のみ）。値・長さ・断片は扱わない。"""
    return bool(get_token())


def _is_test_database() -> bool:
    return str(settings.DATABASE_URL or "").rsplit("/", 1)[-1].split("?")[0].endswith("_test")


def _httpx_transport(url: str, params: dict, headers: dict, timeout: float) -> Tuple[int, bytes]:
    """実 HTTP 送信（GET のみ）。自動テストでは差し替える（テストDBでは実送信を拒否）。"""
    if _is_test_database():
        raise NotePMError("blocked")
    import httpx

    try:
        with httpx.Client(timeout=timeout, follow_redirects=False) as client:
            resp = client.get(url, params=params, headers=headers)
        return resp.status_code, resp.content
    except httpx.TimeoutException:
        raise NotePMError("unavailable") from None
    except httpx.HTTPError:
        raise NotePMError("unavailable") from None


# テストではこの関数オブジェクトを差し替える: (url, params, headers, timeout) -> (status, body_bytes)
transport: Callable[[str, dict, dict, float], Tuple[int, bytes]] = _httpx_transport



def _flag(value) -> bool:
    """NotePM は read_flag / write_flag を 1/0（整数）で返す。true / "1" / "true" も真として扱う。"""
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value == 1
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true")
    return False


class NotePMClient:
    """GET 専用クライアント。team_host は normalize_team_domain の戻り値のみ受け付ける。"""

    def __init__(self, team_host: str):
        # 呼び出し元の取り違えを防ぐため、ここでも再検証する
        self.team_host = normalize_team_domain(team_host)
        self.base_url = build_base_url(self.team_host)

    # --- 低レベル ---------------------------------------------------------

    def _get(self, path: str, params: Optional[dict] = None) -> dict:
        token = get_token()
        if not token:
            raise NotePMError("token_missing")
        url = f"{self.base_url}{path}"
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        try:
            status, body = transport(url, params or {}, headers, REQUEST_TIMEOUT_SECONDS)
        except NotePMError:
            raise
        except Exception as exc:  # noqa: BLE001 - 例外メッセージにヘッダー等が含まれ得るため種別のみ
            logger.warning("NotePM request failed: path=%s exc_type=%s", path, type(exc).__name__)
            raise NotePMError("unavailable") from None

        if status == 429:
            raise NotePMError("rate_limit", status)
        if status in (401, 403):
            raise NotePMError("auth_error", status)
        if status >= 500 or status in (404, 408) or 300 <= status < 400:
            raise NotePMError("unavailable", status)
        if status != 200:
            raise NotePMError("invalid_response", status)
        if body is None or len(body) > MAX_RESPONSE_BYTES:
            raise NotePMError("invalid_response", status)
        try:
            data = json.loads(body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise NotePMError("invalid_response", status) from None
        if not isinstance(data, dict):
            raise NotePMError("invalid_response", status)
        return data

    # --- 公開メソッド（すべて読み取り） ---------------------------------

    def get_account(self) -> AccountInfo:
        """GET /user/account → トークンの read_flag / write_flag（ユーザー名・メールは取り込まない）。"""
        data = self._get("/user/account")
        token_info = data.get("token")
        if isinstance(token_info, list):
            token_info = token_info[0] if token_info else None
        if not isinstance(token_info, dict) or "read_flag" not in token_info:
            raise NotePMError("invalid_response")
        return AccountInfo(
            read_flag=_flag(token_info.get("read_flag")),
            write_flag=_flag(token_info.get("write_flag")),
        )

    def list_notes(self) -> List[NoteInfo]:
        """GET /notes → アクセス可能なノート一覧（ページ数に上限あり）。"""
        notes: List[NoteInfo] = []
        for page in range(1, NOTES_MAX_PAGES + 1):
            data = self._get("/notes", {"page": page, "per_page": NOTES_PER_PAGE})
            items = data.get("notes")
            if not isinstance(items, list):
                raise NotePMError("invalid_response")
            for it in items:
                if not isinstance(it, dict):
                    continue
                code = it.get("note_code")
                name = it.get("name")
                if not isinstance(code, str) or not code or not isinstance(name, str):
                    continue
                desc = it.get("description")
                scope = it.get("scope")
                notes.append(NoteInfo(
                    note_code=code,
                    name=name,
                    description=desc if isinstance(desc, str) else "",
                    scope=scope if isinstance(scope, str) else "",
                    archived=it.get("archived") is True,
                ))
            meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
            if not meta.get("next_page") or not items:
                break
        return notes

    def search_pages(self, query: str, note_code: str, per_page: int = 5) -> List[PageHit]:
        """GET /pages?q=...&note_code=... （アーカイブ除外・1ノート分・件数上限つき）。"""
        data = self._get("/pages", {
            "q": query,
            "note_code": note_code,
            "include_archived": 0,
            "search_engine_type": "v2",
            "only_title": 0,
            "page": 1,
            "per_page": max(1, min(int(per_page), 10)),
        })
        items = data.get("pages")
        if not isinstance(items, list):
            raise NotePMError("invalid_response")
        hits: List[PageHit] = []
        for it in items:
            if not isinstance(it, dict) or it.get("archived") is True:
                continue
            title = it.get("title")
            if not isinstance(title, str) or not title.strip():
                continue
            body = it.get("body")
            updated = it.get("updated_at")
            code = it.get("note_code")
            hits.append(PageHit(
                title=title,
                body=body if isinstance(body, str) else "",
                updated_at=updated if isinstance(updated, str) else None,
                note_code=code if isinstance(code, str) else note_code,
            ))
        return hits
