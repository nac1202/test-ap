import os
import sys
import json
import requests
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fetchers.market_data import GMOCoinAPI, PRIVATE_ENDPOINT

load_dotenv()

exchange = GMOCoinAPI()

# 売り建玉 (Short) 0.07 を決済するために、side="BUY" で投げてみる
symbol = 'BTC_JPY'
side = 'BUY' # 買戻し注文なので BUY
size = '0.07'
path = '/v1/closeBulkOrder'
url = PRIVATE_ENDPOINT + path

req_body = {
    "symbol": symbol,
    "side": side,
    "executionType": "MARKET",
    "size": size
}
body_json = json.dumps(req_body)
headers = exchange._get_private_headers('POST', path, body_json)
headers['Content-Type'] = 'application/json'

try:
    res = requests.post(url, headers=headers, data=body_json)
    print("Response for side='BUY':")
    print(res.json())
except Exception as e:
    print("Error:", e)
