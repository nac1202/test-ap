"""連携サービス設定の安全な確認ツール（値は一切表示しない）。

使い方: docker exec nac_hub_backend python check_integrations_env.py

表示するのは true / false のみ。NOTEPM_API_TOKEN の値・文字数・先頭/末尾文字は表示しない。
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings  # noqa: E402


def _flag(value: bool) -> str:
    return "true" if value else "false"


def main() -> int:
    token = settings.NOTEPM_API_TOKEN
    in_settings = bool(token is not None and token.get_secret_value().strip())
    in_process_env = bool(os.environ.get("NOTEPM_API_TOKEN", "").strip())
    env_file = os.path.exists(os.path.join(os.path.dirname(__file__), ".env.integrations"))

    print(f"NotePM token configured (app settings): {_flag(in_settings)}")
    print(f"NOTEPM_API_TOKEN in process environment: {_flag(in_process_env)}")
    print(f"backend/.env.integrations exists:        {_flag(env_file)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
