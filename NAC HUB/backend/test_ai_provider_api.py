"""
なっくん 外部AI Provider 自動テスト (POST /api/v1/ai/chat, GET /api/v1/ai/status)

OpenAI 実APIは一切呼ばない（SDKクライアントを差し替え）。nac_hub_test のみ使用。

 1. AI_PROVIDER=mock で従来回答
 2. AI_PROVIDER=openai で Provider 選択
 3. APIキー未設定で安全にモックへフォールバック
 4. OpenAI成功レスポンス（mock client）
 5. タイムアウト時フォールバック
 6. 429時フォールバック
 7. 5xx時フォールバック
 8. 不正レスポンス時フォールバック
 9. 1送信につき履歴1件（多重保存なし）
10. 履歴保存
11. 履歴ユーザー分離
12. 会社スコープ
13. 会話履歴上限（往復数・文字数）
14. 秘密情報非露出（モデルへ渡さない）
15. APIレスポンス mode
16. fallback_used
17. 実行ログ
18. APIキーがログ・レスポンス・DB・監査ログに含まれない
19. 外部APIを実際には呼ばない
20. モデル/推論設定が環境設定で切り替わる・statusエンドポイント
"""
import atexit
import logging
import os
import sys
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
from app.core import security
from app.services.ai import openai_provider, factory
from app.services.ai.base import AIProviderError
from app.services.ai.history import build_conversation_history, redact_secrets, REDACTED
from app.services.ai.instructions import NAKKUN_INSTRUCTIONS
from app.services.ai.mock_provider import MockProvider
from app.services.ai.openai_provider import OpenAIProvider

db_module.Base.metadata.create_all(bind=engine)


def override_get_db():
    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[db_module.get_db] = override_get_db
client = TestClient(app)

U1_EMAIL = "ai_provider_u1@example.com"
U2_EMAIL = "ai_provider_u2@example.com"   # 同一会社の別ユーザー
U3_EMAIL = "ai_provider_u3@example.com"   # 別会社ユーザー
PASSWORD = "AiProviderPass123!"
FAKE_KEY = "sk-TESTFAKEKEY1234567890abcdefXYZ"
SECRET_IN_QUESTION = "sk-USERSECRET9876543210abcdefghij"

# 元の設定値（終了時に復元）
_ORIG = {k: getattr(settings, k) for k in (
    "AI_PROVIDER", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_REASONING_EFFORT",
    "OPENAI_TIMEOUT_SECONDS", "OPENAI_MAX_OUTPUT_TOKENS", "OPENAI_MAX_RETRIES",
    "AI_HISTORY_MAX_TURNS", "AI_HISTORY_MAX_CHARS")}
_ORIG_BUILD_CLIENT = openai_provider._build_client
_ORIG_OPENAI_CLASS = openai.OpenAI


def restore_settings():
    for k, v in _ORIG.items():
        setattr(settings, k, v)
    openai_provider._build_client = _ORIG_BUILD_CLIENT
    openai.OpenAI = _ORIG_OPENAI_CLASS


def configure(**kw):
    restore_settings()
    for k, v in kw.items():
        setattr(settings, k, v)


# ---- 19. 実APIを呼ばない保証: SDKクラスは生成された時点でテスト失敗 ----
def _forbidden_openai(*a, **k):
    raise AssertionError("real openai.OpenAI must never be constructed in tests")


class FakeClient:
    """openai.OpenAI の代替。create() 呼び出しを記録し、指定の応答/例外を返す。"""

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


def ok_response(text_value="外部AIからの回答です。", in_t=120, out_t=45):
    return SimpleNamespace(
        output_text=text_value,
        usage=SimpleNamespace(input_tokens=in_t, output_tokens=out_t),
        status="completed",
    )


def use_fake(behavior):
    fake = FakeClient(behavior)
    openai_provider._build_client = lambda: fake
    openai.OpenAI = _forbidden_openai
    return fake


_REQ = httpx2.Request("POST", "https://api.openai.com/v1/responses")


def status_error(cls, code):
    return cls("error", response=httpx2.Response(code, request=_REQ), body=None)


# ---- ログ捕捉 ----
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
    _lg.propagate = False  # 標準エラー出力へ出さない（捕捉のみ）


def setup():
    db = SessionLocal()
    try:
        for seq, tbl in (("companies_id_seq", "companies"), ("users_id_seq", "users"),
                         ("roles_id_seq", "roles"), ("audit_logs_id_seq", "audit_logs"),
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

        c1 = ensure_company("AiProviderCorp1")
        c2 = ensure_company("AiProviderCorp2")
        role = db.query(Role).filter(Role.name == "admin").first()
        if not role:
            role = Role(name="admin", permissions={})
            db.add(role)
            db.commit()
            db.refresh(role)

        def ensure_user(email, company_id):
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(email=email, password_hash=security.get_password_hash(PASSWORD),
                         company_id=company_id, role_id=role.id, status="active",
                         first_name="AI", last_name="Test", must_change_password=False)
                db.add(u)
            else:
                u.company_id = company_id
                u.role_id = role.id
                u.must_change_password = False
                u.password_hash = security.get_password_hash(PASSWORD)
            db.commit()
            db.refresh(u)
            return u

        users = [ensure_user(U1_EMAIL, c1.id), ensure_user(U2_EMAIL, c1.id), ensure_user(U3_EMAIL, c2.id)]
        _clean_user_data(db, [u.id for u in users])
        ids = [u.id for u in users]
    finally:
        db.close()
    return ids


def _clean_user_data(db, uids):
    chat_ids = [r.id for r in db.query(AIChatHistory).filter(AIChatHistory.user_id.in_(uids)).all()]
    if chat_ids:
        db.query(AIExecutionLog).filter(AIExecutionLog.chat_id.in_(chat_ids)).delete(synchronize_session=False)
    db.query(AIChatHistory).filter(AIChatHistory.user_id.in_(uids)).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.user_id.in_(uids)).delete(synchronize_session=False)
    db.commit()


def teardown():
    """このテストが作成した履歴・実行ログ・監査ログを削除し、設定を復元する。"""
    restore_settings()
    db = SessionLocal()
    try:
        assert db.execute(text("select current_database()")).scalar() == "nac_hub_test"
        uids = [u.id for u in db.query(User).filter(User.email.in_([U1_EMAIL, U2_EMAIL, U3_EMAIL])).all()]
        if uids:
            _clean_user_data(db, uids)
    finally:
        db.close()


atexit.register(teardown)
UIDS = setup()
U1_ID, U2_ID, U3_ID = UIDS


def login(email):
    r = client.post("/api/v1/auth/login", data={"username": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


H1, H2, H3 = login(U1_EMAIL), login(U2_EMAIL), login(U3_EMAIL)


def chat(question, headers=None):
    return client.post("/api/v1/ai/chat", json={"question": question}, headers=headers or H1)


def exec_log_of(chat_id):
    db = SessionLocal()
    try:
        return db.query(AIExecutionLog).filter(AIExecutionLog.chat_id == chat_id).all()
    finally:
        db.close()


def reset_histories():
    db = SessionLocal()
    try:
        _clean_user_data(db, UIDS)
    finally:
        db.close()


FALLBACK_TEXT = "外部AIへ接続できなかったため、一時的に簡易回答モードで回答しています。"


# ---------------------------------------------------------------------------
def test_01_mock_default():
    configure(AI_PROVIDER="mock")
    r = chat("A案件の状況を教えて")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "案件" in d["answer"] and "モック" in d["answer"]
    assert d["mode"] == "mock" and d["provider"] == "mock" and d["fallback_used"] is False
    assert d["warning"] is None
    assert exec_log_of(d["id"])[0].process_details == "mock_response"
    print("PASS: 1. AI_PROVIDER=mock で従来回答")


def test_02_provider_selection():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    assert isinstance(factory.get_provider(), OpenAIProvider)
    configure(AI_PROVIDER="mock")
    assert isinstance(factory.get_provider(), MockProvider)
    configure(AI_PROVIDER="unknown-value")
    assert isinstance(factory.get_provider(), MockProvider)  # 不明値は安全側(mock)
    print("PASS: 2. AI_PROVIDER による Provider 選択")


def test_03_missing_key_fallback():
    for missing in (None, SecretStr(""), SecretStr("   ")):
        configure(AI_PROVIDER="openai", OPENAI_API_KEY=missing)
        fake = use_fake(ok_response())
        r = chat("こんにちは")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mode"] == "fallback" and d["fallback_used"] is True and d["provider"] == "mock"
        assert d["warning"] == FALLBACK_TEXT
        assert fake.calls == [], "OpenAI must not be called without API key"
        assert "error=api_key_missing" in exec_log_of(d["id"])[0].process_details
    st = client.get("/api/v1/ai/status", headers=H1).json()
    assert st["mode"] == "fallback", "key missing must NOT be reported as external"
    print("PASS: 3. APIキー未設定 → 安全にモックへフォールバック（外部AI接続済み表示なし）")


def test_04_openai_success():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY), OPENAI_MODEL="gpt-6-luna")
    fake = use_fake(ok_response("結論から言うと、問題ありません。", 120, 45))
    r = chat("見積書の作り方を教えて")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["answer"] == "結論から言うと、問題ありません。"
    assert d["mode"] == "external" and d["provider"] == "openai" and d["fallback_used"] is False
    assert d["warning"] is None
    assert len(fake.calls) == 1
    kw = fake.calls[0]
    assert kw["model"] == "gpt-6-luna"
    assert kw["instructions"] == NAKKUN_INSTRUCTIONS
    assert kw["store"] is False
    assert kw["input"][-1] == {"role": "user", "content": "見積書の作り方を教えて"}
    assert kw["max_output_tokens"] == settings.OPENAI_MAX_OUTPUT_TOKENS
    assert kw["reasoning"] == {"effort": "low"}
    # 外部検索等のツールは使用しない
    assert "tools" not in kw
    print("PASS: 4. OpenAI成功レスポンス（mock client）")


def _assert_fallback(exc, kind):
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    fake = use_fake(exc)
    r = chat("案件の状況を教えて")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["fallback_used"] is True and d["mode"] == "fallback" and d["provider"] == "mock"
    assert d["warning"] == FALLBACK_TEXT
    assert "案件" in d["answer"]
    assert len(fake.calls) == 1, "provider layer must not loop/retry by itself"
    pd = exec_log_of(d["id"])[0].process_details
    assert f"error={kind}" in pd and "fallback=true" in pd and "success=false" in pd, pd
    return d


def test_05_timeout():
    _assert_fallback(openai.APITimeoutError(request=_REQ), "timeout")
    _assert_fallback(openai.APIConnectionError(request=_REQ), "connection_error")
    print("PASS: 5. タイムアウト/接続エラー時フォールバック")


def test_06_rate_limit():
    _assert_fallback(status_error(openai.RateLimitError, 429), "rate_limit")
    print("PASS: 6. 429時フォールバック")


def test_07_server_error():
    _assert_fallback(status_error(openai.InternalServerError, 500), "server_error")
    _assert_fallback(status_error(openai.InternalServerError, 503), "server_error")
    _assert_fallback(status_error(openai.AuthenticationError, 401), "auth_error")
    print("PASS: 7. 5xx(・認証エラー)時フォールバック")


def test_08_invalid_response():
    _assert_fallback(SimpleNamespace(output_text="", usage=None, status="completed"), "invalid_response")
    _assert_fallback(SimpleNamespace(output_text=None, usage=None, status="failed"), "invalid_response")
    _assert_fallback(SimpleNamespace(), "invalid_response")
    _assert_fallback(RuntimeError("boom sk-LEAKYKEY1234567890"), "unexpected")
    print("PASS: 8. 不正レスポンス・想定外例外時フォールバック")


def test_09_one_send_one_pair():
    configure(AI_PROVIDER="mock")
    reset_histories()
    before = len(client.get("/api/v1/ai/history", headers=H1).json())
    assert before == 0
    chat("こんにちは")
    items = client.get("/api/v1/ai/history", headers=H1).json()
    assert len(items) == 1 and items[0]["question"] == "こんにちは" and items[0]["answer"]
    chat("もう一度")
    assert len(client.get("/api/v1/ai/history", headers=H1).json()) == 2
    print("PASS: 9. 1送信につき質問1件・回答1件（多重保存なし）")


def test_10_history_saved():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    reset_histories()
    use_fake(ok_response("保存される回答"))
    d = chat("保存確認").json()
    db = SessionLocal()
    try:
        rec = db.query(AIChatHistory).filter(AIChatHistory.id == d["id"]).first()
        assert rec.user_id == U1_ID and rec.question == "保存確認" and rec.answer == "保存される回答"
    finally:
        db.close()
    hist = client.get("/api/v1/ai/history", headers=H1).json()
    assert [h["answer"] for h in hist] == ["保存される回答"]
    assert client.delete("/api/v1/ai/history", headers=H1).status_code == 200
    assert client.get("/api/v1/ai/history", headers=H1).json() == []
    print("PASS: 10. 履歴保存・復元・削除")


def test_11_user_isolation():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    reset_histories()
    use_fake(ok_response("U2への回答"))
    chat("U2だけの秘密の話題ZZZ", H2)
    fake = use_fake(ok_response("U1への回答"))
    chat("U1の質問", H1)
    sent = repr(fake.calls[0]["input"])
    assert "U2だけの秘密の話題ZZZ" not in sent and "U2への回答" not in sent
    assert [h["question"] for h in client.get("/api/v1/ai/history", headers=H1).json()] == ["U1の質問"]
    assert [h["question"] for h in client.get("/api/v1/ai/history", headers=H2).json()] == ["U2だけの秘密の話題ZZZ"]
    print("PASS: 11. 履歴のユーザー分離（モデル入力にも混入しない）")


def test_12_company_scope():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    reset_histories()
    use_fake(ok_response("別会社への回答"))
    chat("別会社だけの話題QQQ", H3)
    fake = use_fake(ok_response("自社への回答"))
    chat("自社の質問", H1)
    chat("自社の質問2", H2)
    for f in (fake,):
        for call in f.calls:
            assert "別会社だけの話題QQQ" not in repr(call["input"]) and "別会社への回答" not in repr(call["input"])
    assert client.get("/api/v1/ai/history", headers=H1).json()[0]["question"] == "自社の質問"
    assert all("QQQ" not in h["question"] for h in client.get("/api/v1/ai/history", headers=H2).json())
    print("PASS: 12. 会社スコープ（他会社の履歴をモデルへ渡さない）")


def test_13_history_limits():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY),
              AI_HISTORY_MAX_TURNS=10, AI_HISTORY_MAX_CHARS=6000)
    reset_histories()
    db = SessionLocal()
    try:
        for i in range(15):
            db.add(AIChatHistory(user_id=U1_ID, question=f"質問{i:02d}", answer=f"回答{i:02d}"))
        db.commit()
        h = build_conversation_history(db, U1_ID)
        assert len(h) == 20, f"expected 10 turns (20 messages), got {len(h)}"
        assert h[0] == {"role": "user", "content": "質問05"} and h[-1] == {"role": "assistant", "content": "回答14"}
        assert "質問04" not in repr(h)  # 古い履歴は含めない

        settings.AI_HISTORY_MAX_CHARS = 30
        h2 = build_conversation_history(db, U1_ID)
        assert 0 < len(h2) < 20
        assert sum(len(m["content"]) for m in h2) <= 30
        assert h2[-1]["content"] == "回答14"  # 直近が優先

        settings.AI_HISTORY_MAX_TURNS = 0
        assert build_conversation_history(db, U1_ID) == []
    finally:
        db.close()
    # エンドツーエンド: 実際にモデルへ渡す入力も上限内
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY),
              AI_HISTORY_MAX_TURNS=3, AI_HISTORY_MAX_CHARS=6000)
    fake = use_fake(ok_response())
    chat("現在の質問")
    inp = fake.calls[0]["input"]
    assert len(inp) == 3 * 2 + 1 and inp[-1]["content"] == "現在の質問"
    print("PASS: 13. 会話履歴上限（往復数・文字数・直近優先）")


def test_14_secret_not_sent_to_model():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY),
              AI_HISTORY_MAX_TURNS=10, AI_HISTORY_MAX_CHARS=6000)
    reset_histories()
    db = SessionLocal()
    try:
        db.add(AIChatHistory(user_id=U1_ID, question=f"APIキーは {SECRET_IN_QUESTION} です",
                             answer="password: HunterTwo!99 を受け取りました"))
        db.commit()
    finally:
        db.close()
    fake = use_fake(ok_response())
    chat(f"token={SECRET_IN_QUESTION} と Bearer abcdefghijklmnop1234 を使って")
    sent = repr(fake.calls[0])
    for leaked in (SECRET_IN_QUESTION, "HunterTwo!99", "abcdefghijklmnop1234", FAKE_KEY):
        assert leaked not in sent, f"{leaked[:6]}... leaked to model input"
    assert REDACTED in sent
    assert "sk-" not in redact_secrets("key sk-abcdefgh12345678")
    assert "postgresql://" not in redact_secrets("postgresql://u:p@db:5432/x")
    print("PASS: 14. 秘密情報らしき値をモデルへ渡さない")


def test_15_16_mode_and_fallback_fields():
    configure(AI_PROVIDER="mock")
    assert chat("a").json()["mode"] == "mock"
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    use_fake(ok_response())
    d = chat("b").json()
    assert d["mode"] == "external" and d["fallback_used"] is False
    use_fake(status_error(openai.RateLimitError, 429))
    d = chat("c").json()
    assert d["mode"] == "fallback" and d["fallback_used"] is True and d["warning"]
    for key in ("id", "question", "answer", "created_at", "mode", "provider", "fallback_used", "warning"):
        assert key in d
    print("PASS: 15/16. APIレスポンス mode / fallback_used / warning")


def test_17_execution_log():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY), OPENAI_MODEL="gpt-6-luna")
    use_fake(ok_response("ok", 111, 22))
    d = chat("実行ログ確認").json()
    log = exec_log_of(d["id"])[0]
    pd = log.process_details
    for expected in ("provider=openai", "model=gpt-6-luna", "success=true", "fallback=false",
                     "error=none", "input_usage=111", "output_usage=22", "latency_ms="):
        assert expected in pd, f"{expected} missing in {pd}"
    assert log.used_plugins == [] and log.used_data == "none"
    # 全文プロンプト・質問文・回答文・キーは保存されない
    assert "実行ログ確認" not in pd and NAKKUN_INSTRUCTIONS[:20] not in pd and FAKE_KEY not in pd
    lowered = (pd + str(log.used_data)).lower()
    for forbidden in ("password", "token", "secret_key", "authorization", "bearer"):
        assert forbidden not in lowered
    print("PASS: 17. 実行ログ（provider/model/成否/処理時間/トークン数/フォールバック/エラー種別）")


def test_18_key_never_exposed():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    _cap.lines.clear()
    responses = []
    use_fake(ok_response())
    responses.append(chat("通常").text)
    use_fake(status_error(openai.RateLimitError, 429))
    responses.append(chat("エラー").text)
    use_fake(RuntimeError(f"Incorrect API key provided: {FAKE_KEY}"))
    responses.append(chat("漏えい例外").text)
    responses.append(client.get("/api/v1/ai/status", headers=H1).text)
    responses.append(client.get("/api/v1/ai/history", headers=H1).text)
    for body in responses:
        assert FAKE_KEY not in body and "OPENAI_API_KEY" not in body
    assert FAKE_KEY not in "\n".join(_cap.lines), "API key leaked into logs"
    assert FAKE_KEY not in repr(settings) and FAKE_KEY not in str(settings.OPENAI_API_KEY)
    db = SessionLocal()
    try:
        blob = " ".join(
            [str(r.process_details) + str(r.used_data) for r in db.query(AIExecutionLog).all()]
            + [r.question + r.answer for r in db.query(AIChatHistory).all()]
            + [str(r.details) for r in db.query(AuditLog).all()])
        assert FAKE_KEY not in blob, "API key leaked into DB"
        from app.models.setting import PluginConfig
        assert FAKE_KEY not in " ".join(str(p.config_json) for p in db.query(PluginConfig).all())
    finally:
        db.close()
    print("PASS: 18. APIキーがログ・レスポンス・DB・監査ログ・設定reprに含まれない")


def test_19_no_real_api_calls():
    # テスト中に実SDKクライアントが生成されたら _forbidden_openai が失敗させる
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    openai_provider._build_client = _ORIG_BUILD_CLIENT   # 本物の組み立て関数
    openai.OpenAI = _forbidden_openai
    d = chat("実クライアント生成の禁止確認").json()
    # 生成しようとして AssertionError → 想定外例外としてフォールバック（外部通信は発生しない）
    assert d["fallback_used"] is True and d["mode"] == "fallback"
    print("PASS: 19. 外部APIを実際には呼ばない（実クライアント生成を検知）")


def test_20_settings_switch_and_status():
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY),
              OPENAI_MODEL="gpt-6.1-sol", OPENAI_REASONING_EFFORT="")
    fake = use_fake(ok_response())
    chat("モデル切替")
    kw = fake.calls[0]
    assert kw["model"] == "gpt-6.1-sol", "model must follow OPENAI_MODEL only"
    assert "reasoning" not in kw, "blank effort must omit reasoning"
    configure(AI_PROVIDER="mock")
    assert client.get("/api/v1/ai/status", headers=H1).json() == {"mode": "mock"}
    configure(AI_PROVIDER="openai", OPENAI_API_KEY=SecretStr(FAKE_KEY))
    assert client.get("/api/v1/ai/status", headers=H1).json() == {"mode": "external"}
    assert client.get("/api/v1/ai/status").status_code == 401
    # client生成時の上限設定（無限リトライ禁止）
    captured = {}

    def fake_ctor(**kw):
        captured.update(kw)
        return SimpleNamespace()
    openai.OpenAI = fake_ctor
    openai_provider._build_client = _ORIG_BUILD_CLIENT
    settings.OPENAI_TIMEOUT_SECONDS = 12
    settings.OPENAI_MAX_RETRIES = 1
    openai_provider._build_client()
    assert captured["timeout"] == 12 and captured["max_retries"] == 1
    assert captured["api_key"] == FAKE_KEY
    print("PASS: 20. モデル/推論設定の切替・statusエンドポイント・タイムアウト/リトライ上限")


TESTS = [
    test_01_mock_default, test_02_provider_selection, test_03_missing_key_fallback,
    test_04_openai_success, test_05_timeout, test_06_rate_limit, test_07_server_error,
    test_08_invalid_response, test_09_one_send_one_pair, test_10_history_saved,
    test_11_user_isolation, test_12_company_scope, test_13_history_limits,
    test_14_secret_not_sent_to_model, test_15_16_mode_and_fallback_fields,
    test_17_execution_log, test_18_key_never_exposed, test_19_no_real_api_calls,
    test_20_settings_switch_and_status,
]

if __name__ == "__main__":
    for t in TESTS:
        t()
    print("\n==========================================")
    print("ALL AI PROVIDER TESTS PASSED!")
    print("==========================================")
