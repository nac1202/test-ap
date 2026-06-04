import os
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

GMO_API_KEY = os.getenv("GMO_API_KEY")
GMO_API_SECRET = os.getenv("GMO_API_SECRET")

# 基本設定
SYMBOL = 'BTC/JPY'
TRADE_AMOUNT_LIMIT = int(os.getenv("TRADE_AMOUNT_LIMIT", "100000"))
