import os
import sys
from dotenv import load_dotenv

# プロジェクトのルートディレクトリをパスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fetchers.market_data import GMOCoinAPI

load_dotenv()

exchange = GMOCoinAPI()

print("--- get_balance ---")
balance = exchange.get_balance()
print(balance)

print("\n--- get_margin_balance ---")
margin = exchange.get_margin_balance()
print(margin)

print("\n--- get_open_positions (BTC_JPY) ---")
positions = exchange.get_open_positions('BTC_JPY')
print(positions)

print("\n--- get_open_positions (without symbol) ---")
# 引数なしで呼ぶとデフォルト 'BTC_JPY' なので、APIのパスからsymbolを抜いたものをテスト
import requests
from fetchers.market_data import PRIVATE_ENDPOINT
path = '/v1/openPositions'
url = PRIVATE_ENDPOINT + path
headers = exchange._get_private_headers('GET', path)
try:
    res = requests.get(url, headers=headers)
    print("No symbol filter:", res.json())
except Exception as e:
    print("Error:", e)
