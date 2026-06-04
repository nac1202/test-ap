import os
import sys
import time
import datetime
import requests
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fetchers.market_data import GMOCoinAPI, PUBLIC_ENDPOINT, PRIVATE_ENDPOINT

load_dotenv()

class GMOCoinAPIFixed(GMOCoinAPI):
    def __init__(self):
        super().__init__()
        self.time_offset = 0.0
        self.sync_time()

    def _get_server_time_offset(self):
        try:
            url = f"{PUBLIC_ENDPOINT}/v1/ticker?symbol=BTC_JPY"
            t_start = time.time() * 1000
            res = requests.get(url, timeout=5).json()
            t_end = time.time() * 1000
            
            if 'responsetime' in res:
                resp_str = res['responsetime']
                if resp_str.endswith('Z'):
                    resp_str = resp_str[:-1]
                
                if '.' in resp_str:
                    dt = datetime.datetime.strptime(resp_str, "%Y-%m-%dT%H:%M:%S.%f")
                else:
                    dt = datetime.datetime.strptime(resp_str, "%Y-%m-%dT%H:%M:%S")
                
                server_time_ms = dt.replace(tzinfo=datetime.timezone.utc).timestamp() * 1000
                rtt = t_end - t_start
                estimated_server_time = server_time_ms + (rtt / 2)
                offset = estimated_server_time - t_end
                return offset
        except Exception as e:
            print("Failed to sync time offset:", e)
        return 0.0

    def sync_time(self):
        self.time_offset = self._get_server_time_offset()
        print(f"Time offset synced: {self.time_offset:.2f} ms")

    def _get_private_headers(self, method, path, body=None):
        adjusted_time = time.time() * 1000 + self.time_offset
        timestamp = str(int(adjusted_time))
        text = timestamp + method + path
        if body:
            text += body
            
        import hmac
        import hashlib
        sign = hmac.new(bytes(self.secret.encode('ascii')), bytes(text.encode('ascii')), hashlib.sha256).hexdigest()
        
        return {
            'API-KEY': self.key,
            'API-TIMESTAMP': timestamp,
            'API-SIGN': sign
        }

exchange = GMOCoinAPIFixed()

print("--- get_balance ---")
balance = exchange.get_balance()
print(balance)

print("\n--- get_margin_balance ---")
margin = exchange.get_margin_balance()
print(margin)
