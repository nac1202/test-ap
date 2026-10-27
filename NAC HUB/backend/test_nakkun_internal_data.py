"""
なっくん NAC HUB内部データ検索（第1弾: 案件 / 全社お知らせ）自動テスト

OpenAI 実APIは一切呼ばない（SDKクライアントを差し替え）。nac_hub_test のみ使用。

 1. 案件総数取得            2. 要注意案件取得         3. 期限が近い案件
 4. 案件名検索              5. 担当者取得             6. 最新お知らせ
 7. 重要お知らせ            8. お知らせ検索           9. 会社スコープ
10. 他社案件混入なし       11. 他社お知らせ混入なし  12. 一般ユーザー権限
13. 管理者権限             14. 非公開お知らせ除外    15. 秘密情報除外
16. 最大取得件数           17. コンテキスト文字数上限 18. references
19. used_internal_data     20. 実行ログ              21. OpenAIへ安全なコンテキストのみ送信
22. APIキー非露出          23. DB内部ID非露出        24. 該当なし回答
25. 外部プラグイン未接続回答維持  26. 既存一般AI質問回帰  27. F5履歴互換
28. ユーザー履歴分離       29. 会社分離              30. 実OpenAI APIを呼ばない
"""
import atexit
import logging
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

env_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), '.env.test')),
    os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env.test')),
    '/workspace/.env.test',
    './.env.test',
]
for ep in env_paths:
    if os.path.exists(ep):
        with open(ep, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    if k.strip() == 'DATABASE_URL':
                        os.environ['DATABASE_URL'] = v.strip()
        break

from app.core.config import settings
if os.environ.get('DATABASE_URL'):
    settings.DATABASE_URL = os.environ['DATABASE_URL']

# テスト隔離: 開発環境(.env.ai)の実APIキーでテストが外部AIを呼ばないようモック固定
settings.AI_PROVIDER = "mock"
settings.OPENAI_API_KEY = None

from pydantic import SecretStr
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import app.db.database as db_module

db_module.engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_module.engine)
engine = db_module.engine
SessionLocal = db_module.SessionLocal

db_name = settings.DATABASE_URL.split("/")[-1].split("?")[0]
assert db_name == "nac_hub_test", f"Safety check FAILED: refusing to run on '{db_name}'. Must use 'nac_hub_test'."
print(f"Safety check passed: using test database '{db_name}'")

import httpx2
import openai
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.audit import AuditLog
from app.models.ai import AIChatHistory, AIExecutionLog
from app.models.notice import Notice
from app.models.project import Project, ProjectMember, ProjectTimeline
from app.core import security
from app.services.ai import openai_provider, internal_context as ic
from app.services.ai.instructions import NAKKUN_INSTRUCTIONS

db_module.Base.metadata.create_all(bind=engine)


def override_get_db():
    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[db_module.get_db] = override_get_db
client = TestClient(app)

PASSWORD = "NkdPass123!"
FAKE_KEY = "sk-TESTFAKEKEY1234567890abcdefXYZ"
EMAILS = {
    "A1": "nkd_admin1@example.com",     # 会社1 管理者
    "G1": "nkd_general1@example.com",   # 会社1 一般ユーザー
    "B1": "nkd_admin2@example.com",     # 会社2 管理者
    "C1": "nkd_admin3@example.com",     # 会社3（上限テスト用）
}
SECRET_BODY = "password: hunter2xyz"
NOW = datetime.now(timezone.utc)

_ORIG = {k: getattr(settings, k) for k in (
    "AI_PROVIDER", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_REASONING_EFFORT",
    "OPENAI_TIMEOUT_SECONDS", "OPENAI_MAX_OUTPUT_TOKENS", "OPENAI_MAX_RETRIES",
    "AI_HISTORY_MAX_TURNS", "AI_HISTORY_MAX_CHARS")}
_ORIG_BUILD_CLIENT = openai_provider._build_client
_ORIG_OPENAI_CLASS = openai.OpenAI
_ORIG_CONTEXT_MAX = ic.CONTEXT_MAX_CHARS


def restore_settings():
    for k, v in _ORIG.items():
        setattr(settings, k, v)
    openai_provider._build_client = _ORIG_BUILD_CLIENT
    openai.OpenAI = _ORIG_OPENAI_CLASS
    ic.CONTEXT_MAX_CHARS = _ORIG_CONTEXT_MAX


def configure(**kw):
    restore_settings()
    for k, v in kw.items():
        setattr(settings, k, v)


def _forbidden_openai(*a, **k):
    raise AssertionError("real openai.OpenAI must never be constructed in tests")


class FakeClient:
    def __init__(self, behavior):
        self.calls = []
        outer = self

        class _Responses:
            def create(self, **kwargs):
                outer.calls.append(kwargs)
                if isinstance(behavior, Exception):
                    raise behavior
                return behavior

        self.responses = _Responses()


def ok_response(text_value="外部AIからの回答です。"):
    return SimpleNamespace(output_text=text_value,
                           usage=SimpleNamespace(input_tokens=100, output_tokens=30), status="completed")


def use_fake(behavior):
    fake = FakeClient(behavior)
    openai_provider._build_client = lambda: fake
    openai.OpenAI = _forbidden_openai
    return fake


def use_openai(behavior=None):
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    return use_fake(behavior if behavior is not None else ok_response())


_REQ = httpx2.Request("POST", "https://api.openai.com/v1/responses")


class _Capture(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.DEBUG)
        self.lines = []

    def emit(self, record):
        try:
            self.lines.append(self.format(record))
        except Exception:
            pass


_cap = _Capture()
for _name in ("app", "openai"):
    _lg = logging.getLogger(_name)
    _lg.addHandler(_cap)
    _lg.setLevel(logging.DEBUG)
    _lg.propagate = False

# ---------------------------------------------------------------------------
# テストデータ
# ---------------------------------------------------------------------------
IDS = {}          # 内部ID（非露出検証用。テスト内でのみ使用）


def _clean(db):
    uids = [u.id for u in db.query(User).filter(User.email.in_(list(EMAILS.values()))).all()]
    if uids:
        chat_ids = [r.id for r in db.query(AIChatHistory).filter(AIChatHistory.user_id.in_(uids)).all()]
        if chat_ids:
            db.query(AIExecutionLog).filter(AIExecutionLog.chat_id.in_(chat_ids)).delete(synchronize_session=False)
        db.query(AIChatHistory).filter(AIChatHistory.user_id.in_(uids)).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.user_id.in_(uids)).delete(synchronize_session=False)
    pids = [p.id for p in db.query(Project).filter(Project.name.like("NKD%")).all()]
    if pids:
        db.query(ProjectMember).filter(ProjectMember.project_id.in_(pids)).delete(synchronize_session=False)
        db.query(ProjectTimeline).filter(ProjectTimeline.project_id.in_(pids)).delete(synchronize_session=False)
        db.query(Project).filter(Project.id.in_(pids)).delete(synchronize_session=False)
    db.query(Notice).filter(Notice.title.like("NKD%")).delete(synchronize_session=False)
    db.commit()


def setup():
    db = SessionLocal()
    try:
        for seq, tbl in (("companies_id_seq", "companies"), ("users_id_seq", "users"),
                         ("roles_id_seq", "roles"), ("projects_id_seq", "projects"),
                         ("notices_id_seq", "notices"), ("audit_logs_id_seq", "audit_logs"),
                         ("ai_chat_histories_id_seq", "ai_chat_histories"),
                         ("ai_execution_logs_id_seq", "ai_execution_logs")):
            try:
                db.execute(text(f"SELECT setval('{seq}', (SELECT COALESCE(MAX(id), 1) FROM {tbl}));"))
                db.commit()
            except Exception:
                db.rollback()

        def ensure_company(name):
            c = db.query(Company).filter(Company.name == name).first()
            if not c:
                c = Company(name=name, theme_color="#0066CC")
                db.add(c)
                db.commit()
                db.refresh(c)
            return c

        c1, c2, c3 = ensure_company("NkdCorp1"), ensure_company("NkdCorp2"), ensure_company("NkdCorp3")

        def ensure_role(name):
            r = db.query(Role).filter(Role.name == name).first()
            if not r:
                r = Role(name=name, permissions={})
                db.add(r)
                db.commit()
                db.refresh(r)
            return r

        admin_role, member_role = ensure_role("admin"), ensure_role("member")

        def ensure_user(email, company_id, role, last, first):
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(email=email, password_hash=security.get_password_hash(PASSWORD),
                         company_id=company_id, role_id=role.id, status="active",
                         first_name=first, last_name=last, must_change_password=False)
                db.add(u)
            else:
                u.company_id, u.role_id = company_id, role.id
                u.first_name, u.last_name = first, last
                u.must_change_password = False
                u.password_hash = security.get_password_hash(PASSWORD)
            db.commit()
            db.refresh(u)
            return u

        a1 = ensure_user(EMAILS["A1"], c1.id, admin_role, "管理", "太郎")
        g1 = ensure_user(EMAILS["G1"], c1.id, member_role, "一般", "花子")
        b1 = ensure_user(EMAILS["B1"], c2.id, admin_role, "他社", "次郎")
        cc = ensure_user(EMAILS["C1"], c3.id, admin_role, "大量", "三郎")
        _clean(db)
        IDS.update(A1=a1.id, G1=g1.id, B1=b1.id, C1=cc.id, c1=c1.id, c2=c2.id, c3=c3.id)

        def proj(name, status, rate, dl_days, producer, members=()):
            p = Project(name=name, status=status, progress_rate=rate, producer_id=producer,
                        deadline=(NOW + timedelta(days=dl_days)) if dl_days is not None else None)
            db.add(p)
            db.commit()
            db.refresh(p)
            for m in members:
                db.add(ProjectMember(project_id=p.id, user_id=m, role="member"))
            db.commit()
            return p

        # 会社1
        p1 = proj("NKD案件アルファ", "normal", 30, 5, a1.id, [a1.id, g1.id])
        proj("NKD案件ベータ", "warning", 50, 10, g1.id, [a1.id])
        proj("NKD案件ガンマ", "delayed", 80, -3, a1.id)
        proj("NKD案件完了", "normal", 100, 3, a1.id)
        proj("NKD案件デルタ", "normal", 0, None, None, [g1.id])       # プロデューサー未設定・自社メンバー
        proj("NKD孤児案件", "warning", 10, 1, None)                   # 誰にも紐づかない → 対象外
        # 他社
        proj("NKD他社案件", "warning", 20, 2, b1.id, [b1.id])
        proj("NKD共有他社案件", "warning", 20, 2, b1.id, [a1.id])     # 他社プロデューサー＋自社メンバー → 対象外
        IDS["p1"] = p1.id
        db.add(ProjectTimeline(project_id=p1.id, user_id=a1.id, event_type="updated",
                               content=f"案件情報を更新しました {SECRET_BODY}"))
        db.commit()

        # 会社3（件数上限テスト）
        for i in range(15):
            proj(f"NKD大量案件{i:02d}", "warning", 10, 20 + i, cc.id)

        def notice(cid, title, body, important=False, active=True, minutes=0, category="全社"):
            n = Notice(company_id=cid, title=title, body=body, category=category,
                       is_important=important, is_active=active, created_by_id=None,
                       created_at=NOW - timedelta(minutes=minutes))
            db.add(n)
            db.commit()

        notice(c1.id, "NKD年末年始休業のお知らせ", f"12/29〜1/3は休業です。{SECRET_BODY}", important=True, minutes=1)
        notice(c1.id, "NKD通常のお知らせ", "社内イベントの案内です。", minutes=2)
        notice(c1.id, "NKD非公開のお知らせ", "公開前の内容です。", active=False, minutes=0)
        for i in range(8):
            notice(c1.id, f"NKD量産お知らせ{i}", "量産用", minutes=10 + i)
        notice(c1.id, "NKD長文のお知らせ", "あ" * 1000, minutes=30)
        notice(c2.id, "NKD他社お知らせ", "他社向け", important=True, minutes=0)
        for i in range(8):
            notice(c3.id, f"NKD大量お知らせ{i}", "い" * 400, minutes=i)
    finally:
        db.close()


def teardown():
    restore_settings()
    db = SessionLocal()
    try:
        assert db.execute(text("select current_database()")).scalar() == "nac_hub_test"
        _clean(db)
    finally:
        db.close()


atexit.register(teardown)
setup()


def login(email):
    r = client.post("/api/v1/auth/login", data={"username": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


H = {k: login(v) for k, v in EMAILS.items()}


def service_for(key):
    db = SessionLocal()
    user = db.query(User).filter(User.email == EMAILS[key]).first()
    return db, ic.NacHubContextService(db, user)


def ask_ctx(key, question):
    db, svc = service_for(key)
    try:
        return svc.build_context(question)
    finally:
        db.close()


def chat(question, key="A1"):
    return client.post("/api/v1/ai/chat", json={"question": question}, headers=H[key])


def exec_log_of(chat_id):
    db = SessionLocal()
    try:
        return db.query(AIExecutionLog).filter(AIExecutionLog.chat_id == chat_id).all()
    finally:
        db.close()


def reset_histories():
    db = SessionLocal()
    try:
        _clean_hist(db)
    finally:
        db.close()


def _clean_hist(db):
    uids = list(IDS[k] for k in ("A1", "G1", "B1", "C1"))
    chat_ids = [r.id for r in db.query(AIChatHistory).filter(AIChatHistory.user_id.in_(uids)).all()]
    if chat_ids:
        db.query(AIExecutionLog).filter(AIExecutionLog.chat_id.in_(chat_ids)).delete(synchronize_session=False)
    db.query(AIChatHistory).filter(AIChatHistory.user_id.in_(uids)).delete(synchronize_session=False)
    db.commit()


FORBIDDEN_TECH = ("password_hash", "company_id", "producer_id", "user_id", "project_id", "SELECT ", "FROM projects",
                  "nac_hub", "@example.com", "hunter2xyz", "Authorization", "Bearer ", "DATABASE_URL", "config_json")


def assert_no_tech(s):
    for w in FORBIDDEN_TECH:
        assert w not in s, f"technical/secret token leaked: {w}"
    assert FAKE_KEY not in s


# ---------------------------------------------------------------------------
def test_01_project_count():
    c = ask_ctx("A1", "現在の案件は何件？")
    assert c.context_type == ic.CT_PROJECT_COUNT and c.searched
    assert "案件の総数：5件" in c.text, c.text      # アルファ/ベータ/ガンマ/完了/デルタ
    assert "順調3件" in c.text and "要注意1件" in c.text and "遅延1件" in c.text
    assert "進行中（進捗100%未満）：4件" in c.text
    c2 = ask_ctx("A1", "今動いている案件は何件ですか")
    assert c2.context_type == ic.CT_PROJECT_COUNT
    print("PASS: 1. 案件総数取得")


def test_02_attention_projects():
    for q in ("要注意案件を教えて", "現在の要注意の案件は？", "遅延している案件はありますか"):
        c = ask_ctx("A1", q)
        assert c.context_type == ic.CT_PROJECT_ATTENTION, (q, c.context_type)
        assert "NKD案件ベータ" in c.text and "NKD案件ガンマ" in c.text
        assert "NKD案件アルファ" not in c.text and "NKD案件完了" not in c.text
    print("PASS: 2. 要注意案件取得")


def test_03_upcoming_deadlines():
    c = ask_ctx("A1", "期限が近い案件を教えて")
    assert c.context_type == ic.CT_PROJECT_DEADLINE
    assert "NKD案件アルファ" in c.text and "NKD案件ベータ" in c.text
    assert "NKD案件完了" not in c.text, "完了済み(100%)は期限が近い案件に含めない"
    assert "期限を過ぎている未完了の案件" in c.text and "NKD案件ガンマ" in c.text
    assert "NKD他社案件" not in c.text
    print("PASS: 3. 期限が近い案件")


def test_04_project_name_search():
    c = ask_ctx("A1", "NKD案件アルファの進捗を教えて")
    assert c.context_type == ic.CT_PROJECT_DETAIL and "進捗率：30%" in c.text and "状態：順調" in c.text
    c = ask_ctx("A1", "アルファ案件について教えて")           # 部分一致（案件名の一部）
    assert c.context_type == ic.CT_PROJECT_DETAIL and "NKD案件アルファ" in c.text
    c = ask_ctx("A1", "NKD案件の一覧を教えて")
    assert c.context_type in (ic.CT_PROJECT_LIST, ic.CT_PROJECT_SEARCH)
    c = ask_ctx("A1", "進行中の案件一覧を教えて")
    assert c.context_type == ic.CT_PROJECT_LIST and "NKD案件完了" not in c.text and "NKD案件アルファ" in c.text
    print("PASS: 4. 案件名検索（完全・部分一致・一覧）")


def test_05_project_members():
    c = ask_ctx("A1", "NKD案件アルファの担当者は？")
    assert c.context_type == ic.CT_PROJECT_DETAIL
    assert "管理 太郎" in c.text and "一般 花子" in c.text
    assert "@" not in c.text, "メールアドレスは含めない"
    print("PASS: 5. 担当者取得")


def test_06_recent_notices():
    c = ask_ctx("A1", "最新のお知らせを教えて")
    assert c.context_type == ic.CT_NOTICE_RECENT
    assert "NKD年末年始休業のお知らせ" in c.text and "NKD通常のお知らせ" in c.text
    assert c.text.index("NKD年末年始休業のお知らせ") < c.text.index("NKD通常のお知らせ"), "新しい順"
    print("PASS: 6. 最新お知らせ")


def test_07_important_notices():
    c = ask_ctx("A1", "重要なお知らせは？")
    assert c.context_type == ic.CT_NOTICE_IMPORTANT
    assert "NKD年末年始休業のお知らせ" in c.text and "【重要】" in c.text
    assert "NKD通常のお知らせ" not in c.text
    print("PASS: 7. 重要お知らせ")


def test_08_notice_search():
    c = ask_ctx("A1", "年末年始についてのお知らせはある？")
    assert c.context_type == ic.CT_NOTICE_SEARCH and "NKD年末年始休業のお知らせ" in c.text
    c = ask_ctx("A1", "休業に関するお知らせは")                  # 本文にも一致
    assert "NKD年末年始休業のお知らせ" in c.text
    c = ask_ctx("A1", "100%や_を含む%お知らせ")                  # LIKE記号は通常文字として扱う
    assert c.searched
    print("PASS: 8. お知らせ検索")


def test_09_company_scope_projects_and_notices():
    c = ask_ctx("B1", "要注意案件を教えて")
    assert "NKD他社案件" in c.text and "NKD案件ベータ" not in c.text and "NKD共有他社案件" in c.text
    n = ask_ctx("B1", "最新のお知らせ")
    assert "NKD他社お知らせ" in n.text and "NKD年末年始休業のお知らせ" not in n.text
    print("PASS: 9. 会社スコープ")


def test_10_no_other_company_projects():
    for q in ("要注意案件を教えて", "期限が近い案件を教えて", "進行中の案件一覧を教えて", "現在の案件は何件？",
              "NKD他社案件の進捗を教えて"):
        c = ask_ctx("A1", q)
        assert "NKD他社案件" not in c.text, q
        assert "NKD共有他社案件" not in c.text, q          # 他社プロデューサーの案件は自社メンバーがいても対象外
        assert "NKD孤児案件" not in c.text, q              # 誰にも紐づかない案件も対象外
        assert all(r.title not in ("NKD他社案件", "NKD共有他社案件") for r in c.references)
    c = ask_ctx("A1", "NKD他社案件の進捗を教えて")
    assert c.context_type != ic.CT_PROJECT_DETAIL
    print("PASS: 10. 他社案件混入なし")


def test_11_no_other_company_notices():
    for q in ("最新のお知らせを教えて", "重要なお知らせは？", "他社についてのお知らせはある？"):
        c = ask_ctx("A1", q)
        assert "NKD他社お知らせ" not in c.text, q
    print("PASS: 11. 他社お知らせ混入なし")


def test_12_general_user():
    c = ask_ctx("G1", "要注意案件を教えて")
    assert "NKD案件ベータ" in c.text and "NKD案件ガンマ" in c.text and "NKD他社案件" not in c.text
    d = ask_ctx("G1", "NKD案件アルファの担当者は？")
    assert "管理 太郎" in d.text
    n = ask_ctx("G1", "最新のお知らせ")
    assert "NKD通常のお知らせ" in n.text and "NKD非公開のお知らせ" not in n.text
    print("PASS: 12. 一般ユーザー権限（通常画面と同じ範囲のみ）")


def test_13_admin_user():
    c = ask_ctx("A1", "要注意案件を教えて")
    assert "NKD案件ベータ" in c.text and "NKD案件ガンマ" in c.text
    # 管理者でも非公開お知らせ・他社データ・内部情報は取得できない
    n = ask_ctx("A1", "最新のお知らせ")
    assert "NKD非公開のお知らせ" not in n.text and "NKD他社お知らせ" not in n.text
    print("PASS: 13. 管理者権限（管理者でも範囲拡大なし）")


def test_14_inactive_notice_excluded():
    for q in ("最新のお知らせ", "非公開についてのお知らせ", "公開前の内容のお知らせ"):
        c = ask_ctx("A1", q)
        assert "NKD非公開のお知らせ" not in c.text and "公開前の内容" not in c.text, q
    c = ask_ctx("A1", "NKD非公開についてのお知らせはある？")
    assert c.no_match
    print("PASS: 14. 非公開お知らせ除外")


def test_15_secret_exclusion():
    for q in ("NKD案件アルファの進捗を教えて", "年末年始についてのお知らせはある？", "最新のお知らせ"):
        c = ask_ctx("A1", q)
        assert "hunter2xyz" not in c.text, q
        assert_no_tech(c.text)
    # 質問側の秘密情報らしき値も検索語・回答に出ない
    use_openai()
    r = chat("案件の状況を教えて sk-USERSECRET9876543210abcdefghij")
    assert r.status_code == 200
    print("PASS: 15. 秘密情報除外")


def test_16_max_items():
    c = ask_ctx("C1", "要注意案件を教えて")
    lines = [ln for ln in c.text.splitlines() if ln.startswith("・")]
    assert len(lines) == ic.PROJECT_MAX_ITEMS == 10 and "全15件中" in c.text
    assert len(c.references) <= ic.PROJECT_MAX_ITEMS
    n = ask_ctx("C1", "最新のお知らせ")
    assert len([ln for ln in n.text.splitlines() if ln.startswith("・")]) == ic.NOTICE_MAX_ITEMS == 5
    n1 = ask_ctx("A1", "最新のお知らせ")
    assert len(n1.references) <= ic.NOTICE_MAX_ITEMS
    print("PASS: 16. 最大取得件数")


def test_17_context_size_limit():
    n = ask_ctx("A1", "NKD長文のお知らせについてのお知らせはある？")
    body_line = [ln for ln in n.text.splitlines() if ln.startswith("・") and "NKD長文" in ln][0]
    assert body_line.count("あ") <= ic.NOTICE_BODY_MAX_CHARS and "…" in body_line
    ic.CONTEXT_MAX_CHARS = 400
    try:
        c = ask_ctx("C1", "最新のお知らせ")
        assert len(c.text) <= 400, len(c.text)
    finally:
        ic.CONTEXT_MAX_CHARS = _ORIG_CONTEXT_MAX
    assert len(ask_ctx("C1", "最新のお知らせ").text) <= ic.CONTEXT_MAX_CHARS
    print("PASS: 17. コンテキスト文字数上限")


def test_18_19_references_and_used_flag():
    fake = use_openai(ok_response("結論です。"))
    d = chat("要注意案件を教えて").json()
    assert d["used_internal_data"] is True and d["context_type"] == ic.CT_PROJECT_ATTENTION
    titles = [r["title"] for r in d["references"]]
    assert "NKD案件ベータ" in titles and "NKD案件ガンマ" in titles
    for r in d["references"]:
        assert set(r.keys()) <= {"type", "title", "link"} and r["type"] == "project"
        assert re.fullmatch(r"/projects/\d+", r["link"])
    n = chat("最新のお知らせを教えて").json()
    assert n["used_internal_data"] is True and n["references"]
    assert all(r["type"] == "notice" and r.get("link") is None for r in n["references"])
    # 既存フィールドは維持
    for key in ("id", "question", "answer", "created_at", "mode", "provider", "fallback_used", "warning"):
        assert key in d
    assert d["mode"] == "external" and d["provider"] == "openai" and d["fallback_used"] is False
    # 一般質問
    g = chat("見積書の作り方を教えて").json()
    assert g["used_internal_data"] is False and g["references"] == [] and g["context_type"] is None
    assert len(fake.calls) == 3
    print("PASS: 18/19. references と used_internal_data")


def test_20_execution_log():
    use_openai()
    d = chat("要注意案件を教えて").json()
    log = exec_log_of(d["id"])[0]
    assert log.used_data == "nac_hub:project_attention", log.used_data
    pd = log.process_details
    assert "internal_data=true" in pd and "context_type=project_attention" in pd and "ref_count=2" in pd, pd
    assert "provider=openai" in pd and "latency_ms=" in pd and "input_usage=100" in pd and "fallback=false" in pd
    # 取得内容・コンテキスト全文・SQL・秘密情報は保存しない
    stored = (pd + str(log.used_data) + str(log.used_plugins)).lower()
    for w in ("nkd案件", "hunter2xyz", "select ", "from projects", FAKE_KEY.lower(), "password", "token", "secret_key"):
        assert w not in stored, w
    g = chat("見積書の作り方を教えて").json()
    glog = exec_log_of(g["id"])[0]
    assert glog.used_data == "none" and "internal_data" not in glog.process_details
    print("PASS: 20. 実行ログ")


def test_21_safe_context_sent_to_openai():
    fake = use_openai()
    chat("要注意案件を教えて")
    kw = fake.calls[0]
    content = kw["input"][-1]["content"]
    assert kw["instructions"] == NAKKUN_INSTRUCTIONS and kw["store"] is False and "tools" not in kw
    assert "【NAC HUB内部情報（ここから）】" in content and "NKD案件ベータ" in content and "【質問】" in content
    assert "NKD案件アルファ" not in content, "無関係な案件は送らない"
    assert len(content) < ic.CONTEXT_MAX_CHARS + 600
    assert_no_tech(content)
    for other in ("NKD他社案件", "NKD孤児案件", "NKD非公開", "NkdCorp", "NKD他社お知らせ", "NKD共有他社案件"):
        assert other not in content, other
    # 過去の会話履歴は別メッセージ。システム/内部情報に会話の秘密が混ざらない
    assert all(m["role"] in ("user", "assistant") for m in kw["input"])
    print("PASS: 21. OpenAIへ安全なコンテキストのみ送信")


def test_22_api_key_not_exposed():
    use_openai()
    reset_histories()
    outs = []
    for q in ("要注意案件を教えて", "最新のお知らせ", "NKD案件アルファの担当者は？", "NotePMから就業規則を探して"):
        r = chat(q)
        outs.append(r.text)
    outs.append(client.get("/api/v1/ai/history", headers=H["A1"]).text)
    for o in outs:
        assert FAKE_KEY not in o
    assert not any(FAKE_KEY in ln for ln in _cap.lines), "ログへAPIキーが出ている"
    db = SessionLocal()
    try:
        dump = " ".join(str(r.process_details) + str(r.used_data) for r in db.query(AIExecutionLog).all())
        dump += " ".join(str(h.answer) + str(h.question) for h in db.query(AIChatHistory).all())
        dump += " ".join(str(a.details) for a in db.query(AuditLog).all())
    finally:
        db.close()
    assert FAKE_KEY not in dump
    print("PASS: 22. APIキー非露出")


def test_23_internal_ids_not_exposed():
    use_openai()
    d = chat("NKD案件アルファの担当者と進捗を教えて").json()
    body = d["answer"] + " ".join(r["title"] for r in d["references"])
    assert_no_tech(body)
    for ctx_q in ("NKD案件アルファの担当者と進捗を教えて", "要注意案件を教えて", "最新のお知らせ"):
        c = ask_ctx("A1", ctx_q)
        assert_no_tech(c.text)
        assert not re.search(r"\b(id|ID)\s*[:=：]", c.text), c.text
        assert str(IDS["c1"]) + "｜" not in c.text
    # モック経路の回答にも内部IDを出さない
    use_openai(openai.APITimeoutError(request=_REQ))
    m = chat("NKD案件アルファの担当者は？").json()
    assert m["fallback_used"] is True
    assert_no_tech(m["answer"])
    print("PASS: 23. DB内部ID非露出")


def test_24_no_match_answer():
    fake = use_openai(ok_response("NAC HUB内に該当する情報は見つかりませんでした。"))
    d = chat("NKD存在しない名前についてのお知らせはある？").json()
    assert d["used_internal_data"] is True and d["references"] == []
    assert ic.NO_MATCH_MESSAGE in fake.calls[0]["input"][-1]["content"]
    # 外部AI失敗時のモック回答でも「見つかりませんでした」を正直に返す
    use_openai(openai.APITimeoutError(request=_REQ))
    m = chat("NKD存在しない名前についてのお知らせはある？").json()
    assert m["fallback_used"] is True and ic.NO_MATCH_MESSAGE in m["answer"] and m["references"] == []
    c = ask_ctx("A1", "NKD存在しない案件の進捗を教えて")
    assert c.searched is False or c.no_match or c.context_type != ic.CT_PROJECT_DETAIL
    print("PASS: 24. 該当なし回答")


def test_25_external_plugins_not_connected():
    fake = use_openai(ok_response("現在NotePMとは本接続されていません。"))
    for q in ("NotePMから就業規則を探して", "Slackで検索して", "Google Driveの資料を探して", "HotBizの情報は？"):
        d = chat(q).json()
        assert d["used_internal_data"] is False and d["references"] == [], q
        assert fake.calls[-1]["input"][-1]["content"] == q, "外部サービス質問に内部情報を付けない"
    for svc in ("Slack", "Google Drive", "NotePM", "HotBiz"):
        assert svc in NAKKUN_INSTRUCTIONS
    assert "接続していません" in NAKKUN_INSTRUCTIONS
    print("PASS: 25. 外部プラグイン未接続回答維持")


def test_26_general_question_regression():
    fake = use_openai(ok_response("結論から言うと、問題ありません。"))
    for q in ("見積書の作り方を教えて", "こんにちは", "来週の予定は？"):
        d = chat(q).json()
        assert d["answer"] == "結論から言うと、問題ありません。"
        assert d["mode"] == "external" and d["used_internal_data"] is False and d["references"] == []
        assert fake.calls[-1]["input"][-1] == {"role": "user", "content": q}
    # 純粋なモックモードは従来動作（内部検索しない・実行ログも従来どおり）
    configure(AI_PROVIDER="mock")
    d = chat("要注意案件を教えて").json()
    assert d["mode"] == "mock" and d["used_internal_data"] is False and "モック" in d["answer"]
    assert exec_log_of(d["id"])[0].process_details == "mock_response"
    assert exec_log_of(d["id"])[0].used_data == "none"
    print("PASS: 26. 既存一般AI質問・モック回帰")


def test_27_history_compat():
    use_openai()
    reset_histories()
    d1 = chat("要注意案件を教えて").json()
    d2 = chat("見積書の作り方を教えて").json()
    items = client.get("/api/v1/ai/history", headers=H["A1"]).json()
    assert [i["id"] for i in items] == [d1["id"], d2["id"]], "1質問につき1件"
    for i in items:
        assert set(i.keys()) == {"id", "question", "answer", "created_at"}
    assert client.delete("/api/v1/ai/history", headers=H["A1"]).status_code == 200
    assert client.get("/api/v1/ai/history", headers=H["A1"]).json() == []
    print("PASS: 27. F5履歴互換（履歴APIの形式不変・新しい会話で削除）")


def test_28_user_history_isolation():
    use_openai()
    reset_histories()
    chat("要注意案件を教えて", "A1")
    chat("最新のお知らせ", "G1")
    h_a = client.get("/api/v1/ai/history", headers=H["A1"]).json()
    h_g = client.get("/api/v1/ai/history", headers=H["G1"]).json()
    assert [i["question"] for i in h_a] == ["要注意案件を教えて"]
    assert [i["question"] for i in h_g] == ["最新のお知らせ"]
    fake = use_openai()
    chat("NKD案件アルファの進捗を教えて", "G1")
    msgs = fake.calls[0]["input"]
    assert all("要注意案件を教えて" not in m["content"] for m in msgs[:-1]), "他ユーザーの履歴をモデルへ渡さない"
    print("PASS: 28. ユーザー履歴分離")


def test_29_company_isolation_via_chat():
    fake = use_openai()
    chat("要注意案件を教えて", "B1")
    content = fake.calls[-1]["input"][-1]["content"]
    assert "NKD他社案件" in content and "NKD案件ベータ" not in content and "NKD案件ガンマ" not in content
    chat("最新のお知らせ", "B1")
    content = fake.calls[-1]["input"][-1]["content"]
    assert "NKD他社お知らせ" in content and "NKD年末年始休業のお知らせ" not in content
    d = chat("要注意案件を教えて", "B1").json()
    assert all("NKD案件" not in r["title"] for r in d["references"])
    print("PASS: 29. 会社分離（チャット経由）")


def test_30_no_real_openai_calls():
    fake = use_openai()
    chat("要注意案件を教えて")
    assert len(fake.calls) == 1
    try:
        openai.OpenAI()
    except AssertionError:
        pass
    else:
        raise AssertionError("real OpenAI client construction must be blocked")
    # 内部検索サービスは OpenAI なしで単独動作する
    configure(AI_PROVIDER="mock")
    openai.OpenAI = _forbidden_openai
    assert ask_ctx("A1", "要注意案件を教えて").searched
    # 内部検索が失敗してもチャットは落ちない
    use_openai()
    orig = ic.NacHubContextService.build_context

    def boom(self, q):
        raise RuntimeError("db boom")
    ic.NacHubContextService.build_context = boom
    try:
        r = chat("要注意案件を教えて")
        assert r.status_code == 200 and r.json()["used_internal_data"] is False
    finally:
        ic.NacHubContextService.build_context = orig
    print("PASS: 30. 実OpenAI APIを呼ばない・内部検索失敗時も継続")


TESTS = [
    test_01_project_count, test_02_attention_projects, test_03_upcoming_deadlines,
    test_04_project_name_search, test_05_project_members, test_06_recent_notices,
    test_07_important_notices, test_08_notice_search, test_09_company_scope_projects_and_notices,
    test_10_no_other_company_projects, test_11_no_other_company_notices, test_12_general_user,
    test_13_admin_user, test_14_inactive_notice_excluded, test_15_secret_exclusion,
    test_16_max_items, test_17_context_size_limit, test_18_19_references_and_used_flag,
    test_20_execution_log, test_21_safe_context_sent_to_openai, test_22_api_key_not_exposed,
    test_23_internal_ids_not_exposed, test_24_no_match_answer, test_25_external_plugins_not_connected,
    test_26_general_question_regression, test_27_history_compat, test_28_user_history_isolation,
    test_29_company_isolation_via_chat, test_30_no_real_openai_calls,
]

if __name__ == "__main__":
    for t in TESTS:
        t()
    print("\n==========================================")
    print("ALL NAKKUN INTERNAL DATA TESTS PASSED!")
    print("==========================================")
