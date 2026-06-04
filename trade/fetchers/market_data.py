import hmac
import hashlib
import time
import requests
import datetime
from config.settings import GMO_API_KEY, GMO_API_SECRET

PUBLIC_ENDPOINT = 'https://api.coin.z.com/public'
PRIVATE_ENDPOINT = 'https://api.coin.z.com/private'

class GMOCoinAPI:
    def __init__(self, key=GMO_API_KEY, secret=GMO_API_SECRET):
        self.key = key
        self.secret = secret
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
            
        sign = hmac.new(bytes(self.secret.encode('ascii')), bytes(text.encode('ascii')), hashlib.sha256).hexdigest()
        
        return {
            'API-KEY': self.key,
            'API-TIMESTAMP': timestamp,
            'API-SIGN': sign
        }

    def _request_private(self, method, path, body=None, params=None):
        url = PRIVATE_ENDPOINT + path
        # GETリクエストの場合、URLにクエリパラメータを付与することがあるが、
        # GMOコインの署名対象テキストには、クエリパラメータを含めないパス部分（/v1/openPositionsなど）を使用する
        # そのため、署名作成には params なしの path を渡す
        headers = self._get_private_headers(method, path, body)
        if body:
            headers['Content-Type'] = 'application/json'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=headers, data=body, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            res_json = response.json()
            
            # ERR-5008 (時刻ズレ) の場合は時刻同期してリトライ
            if res_json.get('status') == 1:
                messages = res_json.get('messages', [])
                if any(msg.get('message_code') == 'ERR-5008' for msg in messages):
                    print("Detected ERR-5008 (Timestamp error). Syncing time and retrying...")
                    self.sync_time()
                    headers = self._get_private_headers(method, path, body)
                    if body:
                        headers['Content-Type'] = 'application/json'
                    if method == 'GET':
                        response = requests.get(url, headers=headers, params=params, timeout=10)
                    else:
                        response = requests.post(url, headers=headers, data=body, timeout=10)
                    res_json = response.json()
                    
            return res_json
        except Exception as e:
            return {"status": -1, "messages": [{"message_string": str(e)}]}

    def get_balance(self):
        """資産残高を取得（通信テスト・現物用）"""
        return self._request_private('GET', '/v1/account/assets')

    def get_margin_balance(self):
        """証拠金残高・利用可能額・維持率を取得"""
        return self._request_private('GET', '/v1/account/margin')

    def get_open_positions(self, symbol='BTC_JPY'):
        """建玉（ポジション）一覧を取得"""
        return self._request_private('GET', '/v1/openPositions', params={'symbol': symbol})
        
    def close_bulk_order(self, symbol, side, size, execution_type='MARKET'):
        """指定した売買方向の建玉を一括決済（成行）"""
        import json
        req_body = {
            "symbol": symbol,
            "side": side,
            "executionType": execution_type,
            "size": str(size)
        }
        body_json = json.dumps(req_body)
        return self._request_private('POST', '/v1/closeBulkOrder', body=body_json)

    def create_order(self, symbol, side, execution_type, size, price=None, time_in_force='FAK'):
        """新規注文を発注（建玉・現物）"""
        import json
        req_body = {
            "symbol": symbol,
            "side": side,
            "executionType": execution_type,
            "timeInForce": time_in_force,
            "size": str(size)
        }
        if execution_type == 'LIMIT' and price is not None:
            req_body['price'] = str(price)
            
        body_json = json.dumps(req_body)
        return self._request_private('POST', '/v1/order', body=body_json)

    def get_ticker(self, symbol='BTC_JPY'):
        """パブリックAPIで最新価格を取得"""
        path = f'/v1/ticker?symbol={symbol}'
        url = PUBLIC_ENDPOINT + path
        response = requests.get(url, timeout=10)
        return response.json()
        
    def get_klines(self, symbol='BTC_JPY', interval='5min', date=None):
        """過去のローソク足データを取得"""
        if date is None:
            now = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
            date = now.strftime('%Y%m%d')
        path = f'/v1/klines?symbol={symbol}&interval={interval}&date={date}'
        url = PUBLIC_ENDPOINT + path
        response = requests.get(url, timeout=10)
        return response.json()
