"""NotePM 検索サービス（なっくん用・読み取り専用・ホワイトリスト方式）。

設計方針（安全性優先）:
- 質問に明確な NotePM 検索意図がある場合のみ実 API を呼ぶ（一般質問では呼ばない）。
- 検索対象は、管理者が明示的に許可したノート（allowed_note_codes）だけ。未設定なら本文を取得しない。
- 件数・文字数に上限を設ける（許可ノート最大10 / 1ノート最大5件 / 最終最大10件 / 本文500文字 / 合計3500文字）。
- アーカイブは対象外（include_archived=0 かつ応答側でも除外）。
- AI へ渡すのは「タイトル・本文抜粋・更新日」のみ。note_code / page_code / folder_id / ユーザー情報 /
  メール / トークン / API レスポンス全文は渡さない。
- 利用者へ返す参照チップはタイトルのみ（ページ URL 形式は公式仕様で確認できないため、リンクは生成しない）。
"""
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.setting import PluginConfig
from app.services.ai.history import redact_secrets
from app.services.ai.internal_context import InternalContext, Reference
from app.services.notepm import client as notepm_client
from app.services.notepm.client import NotePMClient, NotePMError, normalize_team_domain
from app.services.notepm.schemas import PageHit

logger = logging.getLogger(__name__)

PLUGIN_KEY = "notepm"

# --- 上限値（無制限取得の禁止） ---
ALLOWED_NOTES_MAX = 10
PER_NOTE_MAX_ITEMS = 5
RESULT_MAX_ITEMS = 10
BODY_MAX_CHARS = 500
TITLE_MAX_CHARS = 80
CONTEXT_MAX_CHARS = 3500
KEYWORD_MAX_CHARS = 50

JST = timezone(timedelta(hours=9))

# context_type
CT_SEARCH = "notepm_search"
CT_NO_MATCH = "notepm_no_match"
CT_NOT_ALLOWED = "notepm_not_allowed"
CT_NEED_KEYWORD = "notepm_need_keyword"
CT_ERROR = "notepm_error"

SOURCE = "notepm"

MSG_NOT_ALLOWED = "NotePMとの接続は設定されていますが、NAC HUBから参照可能なノートがまだ設定されていません。"
MSG_NEED_KEYWORD = "NotePMで探したい内容（キーワード）を教えてください。例：「NotePMから就業規則を探して」"
MSG_NO_MATCH = "NotePM（NAC HUBから参照を許可されたノート）内に該当する情報は見つかりませんでした"

# ---------------------------------------------------------------------------
# 質問の分類（固定ルール。LLM は使わない）
# ---------------------------------------------------------------------------

_NOTEPM_WORD = re.compile(r"(notepm|ノートpm|ノートピーエム)", re.IGNORECASE)
_LEADING = re.compile(r"^\s*(?!について|に関)(の中から|の中で|の中の|の中に|の中|内の|内で|内から|内に|から|では|には|って|で|に|の|は|を)\s*")
_TRAILING = re.compile(
    r"(探してください|探して下さい|探して|探したい|探す|検索してください|検索して下さい|検索して|検索したい|検索"
    r"|調べてください|調べて|調べたい|見せて|教えてください|教えて|知りたい|ありますか|あるか|ありますでしょうか|あります|ある"
    r"|ないか|ないですか|ない|ですか|ください|お願いします|お願い|はどこ|どこ|について|に関して|に関する|に関しての"
    r"|して|です|ます|を|の|は|が|で|も|か|\s)$"
)
_PUNCT = re.compile(r"[「」『』\"'“”？?！!。、,]")


def detect_notepm_intent(question: str) -> Optional[str]:
    """NotePM 検索意図があれば、検索キーワード（抽出できなければ空文字）を返す。なければ None。"""
    q = (question or "").strip()
    m = _NOTEPM_WORD.search(q)
    if not m:
        return None
    rest = _PUNCT.sub(" ", q[: m.start()] + " " + q[m.end():]).strip()
    rest = _LEADING.sub("", rest).strip()
    for _ in range(8):  # 末尾の動詞・助詞を順に取り除く（無限ループ防止で回数制限）
        new = _TRAILING.sub("", rest).strip()
        if new == rest:
            break
        rest = new
    rest = re.sub(r"\s+", " ", rest).strip()
    if len(rest) < 2:
        return ""
    return rest[:KEYWORD_MAX_CHARS]


# ---------------------------------------------------------------------------
# 管理者設定（plugin_configs。トークンは保存しない）
# ---------------------------------------------------------------------------

class NotePMConfig:
    def __init__(self, record: Optional[PluginConfig]):
        cfg = record.config_json if (record is not None and isinstance(record.config_json, dict)) else {}
        settings = cfg.get("settings") if isinstance(cfg.get("settings"), dict) else {}
        self.is_active = bool(record.is_active) if record is not None else False
        self.team_domain = str(settings.get("team_domain", "") or "").strip()
        codes = cfg.get("allowed_note_codes")
        self.allowed_codes: List[str] = [c for c in codes if isinstance(c, str)] if isinstance(codes, list) else []
        names = cfg.get("allowed_note_names")
        self.allowed_names: Dict[str, str] = {
            k: v for k, v in names.items() if isinstance(k, str) and isinstance(v, str)
        } if isinstance(names, dict) else {}


def load_config(db: Session, company_id: Optional[int]) -> NotePMConfig:
    record = None
    if company_id:
        record = (
            db.query(PluginConfig)
            .filter(PluginConfig.company_id == company_id, PluginConfig.plugin_name == PLUGIN_KEY)
            .first()
        )
    return NotePMConfig(record)


# ---------------------------------------------------------------------------
# 検索
# ---------------------------------------------------------------------------

_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")


def _clip(text: Optional[str], limit: int) -> str:
    t = (text or "").replace("\r", " ").replace("\n", " ")
    t = _EMAIL.sub("（メールアドレス省略）", t)
    t = redact_secrets(re.sub(r"\s+", " ", t)).strip()
    return t if len(t) <= limit else t[: limit - 1] + "…"


def _fmt_date(value: Optional[str]) -> str:
    if not value:
        return "不明"
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return "不明"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(JST).strftime("%Y-%m-%d")


def _sort_key(hit: PageHit) -> str:
    return hit.updated_at or ""


def _message_context(ctype: str, text: str) -> InternalContext:
    return InternalContext(searched=True, context_type=ctype, label="NotePM", text=text,
                           no_match=True, source=SOURCE)


def search_notepm(
    db: Session, company_id: Optional[int], keyword: str
) -> Optional[InternalContext]:
    """NotePM 検索の入口。NotePM を使える状態でなければ None（= 一般質問として扱う）。"""
    cfg = load_config(db, company_id)
    if not cfg.is_active or not cfg.team_domain or not notepm_client.is_token_configured():
        return None
    try:
        host = normalize_team_domain(cfg.team_domain)
    except NotePMError:
        return None

    allowed = cfg.allowed_codes[:ALLOWED_NOTES_MAX]
    if not allowed:
        return _message_context(CT_NOT_ALLOWED, MSG_NOT_ALLOWED)
    if not keyword:
        return _message_context(CT_NEED_KEYWORD, MSG_NEED_KEYWORD)

    client = NotePMClient(host)
    allowed_set = set(allowed)
    hits: List[PageHit] = []
    error: Optional[NotePMError] = None
    for code in allowed:
        try:
            found = client.search_pages(keyword, code, per_page=PER_NOTE_MAX_ITEMS)
        except NotePMError as err:
            error = err
            logger.warning("NotePM search failed: kind=%s status=%s", err.kind, err.status_code)
            break  # 429 / 401 / 障害時は残りのノートを叩かない（リトライしない）
        for h in found[:PER_NOTE_MAX_ITEMS]:
            if h.note_code in allowed_set:    # 許可外ノートの混入を二重に防ぐ
                hits.append(h)

    if error is not None and not hits:
        return _message_context(CT_ERROR, error.message)
    if not hits:
        return _message_context(CT_NO_MATCH, MSG_NO_MATCH)

    hits.sort(key=_sort_key, reverse=True)
    hits = hits[:RESULT_MAX_ITEMS]

    header = f"NotePM検索結果（NAC HUBから参照を許可されたノート内・キーワード「{_clip(keyword, 30)}」）"
    lines = [header]
    refs: List[Reference] = []
    seen_titles = set()
    shown = 0
    total = len(header)
    for h in hits:
        title = _clip(h.title, TITLE_MAX_CHARS)
        block = (
            f"【{shown + 1}】タイトル：{title}\n"
            f"更新日：{_fmt_date(h.updated_at)}\n"
            f"本文抜粋：{_clip(h.body, BODY_MAX_CHARS) or '（本文なし）'}"
        )
        if total + len(block) + 1 > CONTEXT_MAX_CHARS and shown:
            break  # AIコンテキスト合計上限
        if len(block) + len(header) + 1 > CONTEXT_MAX_CHARS:
            block = block[: CONTEXT_MAX_CHARS - len(header) - 2] + "…"
        lines.append(block)
        shown += 1
        total += len(block) + 1
        if title not in seen_titles:      # 同名ページの参照チップは1つにまとめる
            seen_titles.add(title)
            refs.append(Reference("notepm", title))

    if error is not None:
        lines.append("※一部のノートは検索できませんでした（" + error.message + "）")
    return InternalContext(
        searched=True, context_type=CT_SEARCH, label="NotePM", text="\n".join(lines),
        references=refs, item_count=shown, source=SOURCE,
    )
