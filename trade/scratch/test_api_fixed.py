import os
import sys
import requests
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fetchers.market_data import GMOCoinAPI, PRIVATE_ENDPOINT

load_dotenv()

exchange = GMOCoinAPI()

# バグを修正した方法でリクエストを投げてみる
symbol = 'BTC_JPY'
path = '/v1/openPositions'
# 署名にはパラメータなしのパスを使用
headers = exchange._get_private_headers('GET', path)

# 実際のリクエストURLにはクエリパラメータを含める
url = f"{PRIVATE_ENDPOINT}{path}?symbol={symbol}"

try:
    res = requests.get(url, headers=headers)
    print("Fixed Request Response:")
    print(res.json())
except Exception as e:
    print("Error:", e)
