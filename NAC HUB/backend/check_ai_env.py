"""AI設定の安全な確認ツール（値は一切表示しない）。

使い方: docker exec nac_hub_backend python check_ai_env.py

表示するのは true / false と、秘密ではない設定名（AI_PROVIDER / OPENAI_MODEL）のみ。
OPENAI_API_KEY の値・文字数・先頭/末尾文字は表示しない。
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings  # noqa: E402


def _flag(value: bool) -> str:
    return "true" if value else "false"


def main() -> int:
    key = settings.OPENAI_API_KEY
    key_in_settings = bool(key is not None and key.get_secret_value().strip())
    key_in_process_env = bool(os.environ.get("OPENAI_API_KEY", "").strip())
    env_ai_file = os.path.exists(os.path.join(os.path.dirname(__file__), ".env.ai"))

    try:
        import openai  # noqa: F401
        sdk_ok = True
    except Exception:
        sdk_ok = False

    provider = (settings.AI_PROVIDER or "mock").strip().lower()
    will_use_external = provider == "openai" and key_in_settings and sdk_ok

    print(f"OPENAI_API_KEY configured (app settings): {_flag(key_in_settings)}")
    print(f"OPENAI_API_KEY in process environment:    {_flag(key_in_process_env)}")
    print(f"backend/.env.ai exists:                   {_flag(env_ai_file)}")
    print(f"openai SDK importable:                    {_flag(sdk_ok)}")
    print(f"AI_PROVIDER:                              {provider}")
    print(f"OPENAI_MODEL:                             {settings.OPENAI_MODEL}")
    print(f"external AI will be used:                 {_flag(will_use_external)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
