import math

class OrderManager:
    def __init__(self, exchange_api):
        self.exchange = exchange_api
        
    def execute_spot_signal(self, signal, current_price, balance_info, settings=None):
        if settings is None: settings = {}
        action = signal.get("action", "HOLD")
        if action == "HOLD":
            return {"status": "skipped", "message": "シグナルがないため取引を実行しません。"}
            
        jpy_balance = balance_info.get("jpy", 0)
        btc_balance = balance_info.get("btc", 0)
        
        trade_limit = settings.get("trade_amount_limit", 100000)
        entry_percent = settings.get("entry_size_percent", 20) / 100.0
        
        if action == "BUY_SPOT":
            invest_amount = trade_limit * entry_percent
            
            # 成行購入時のAPI拘束金（スリッページ等に備えた余力バッファ: 約5〜10%）を考慮し、残高の最大90%までを上限とする
            max_usable_jpy = jpy_balance * 0.90
            
            if invest_amount < 1000 or invest_amount > max_usable_jpy:
                invest_amount = min(invest_amount, max_usable_jpy)
                if invest_amount < 1000:
                    return {"status": "error", "message": f"現物購入のための日本円残高が不足しています。(成行拘束バッファ考慮時)"}
                    
            btc_to_buy = math.floor((invest_amount / current_price) * 10000) / 10000.0
            if btc_to_buy < 0.0001:
                return {"status": "error", "message": "現物最小ロット(0.0001 BTC)に満たないため購入不可。"}
                
            res = self.exchange.create_order(symbol="BTC", side="BUY", execution_type="MARKET", size=btc_to_buy)
            if res.get('status') == 0:
                return {"status": "success", "message": f"実行: [TRADE EXECUTED] 🟢 現物 {btc_to_buy} BTC を成行買いしました！"}
            else:
                err_msg = res.get('messages', [{}])[0].get('message_string', str(res))
                return {"status": "error", "message": f"現物買い発注失敗: {err_msg}"}
                
        elif action == "SELL_SPOT":
            if btc_balance < 0.0001:
                return {"status": "skipped", "message": "売却する現物BTCがありません。"}
                
            res = self.exchange.create_order(symbol="BTC", side="SELL", execution_type="MARKET", size=btc_balance)
            if res.get('status') == 0:
                return {"status": "success", "message": f"実行: [TRADE EXECUTED] 🟢 保有中の現物資産({btc_balance} BTC)を全て利益確定売却しました！"}
            else:
                err_msg = res.get('messages', [{}])[0].get('message_string', str(res))
                return {"status": "error", "message": f"現物売り発注失敗: {err_msg}"}
        
        return {"status": "skipped", "message": "アクションなし"}

    def execute_margin_signal(self, signal, current_price, margin_amount, positions_info, settings=None):
        if settings is None: settings = {}
        action = signal.get("action", "HOLD")
        if action == "HOLD":
            return {"status": "skipped", "message": "シグナルがないため取引を実行しません。"}
            
        margin_trade_limit = settings.get("margin_trade_amount_limit", 200000)
        entry_percent = settings.get("entry_size_percent", 20) / 100.0
        
        invest_amount = min(margin_trade_limit * entry_percent, margin_amount)
        
        if action == "OPEN_SHORT":
            if invest_amount < 1000:
                return {"status": "error", "message": "空売り新規建玉に必要な証拠金利用可能額が不足しています。"}
                
            btc_to_trade = invest_amount / current_price
            btc_to_trade_rounded = math.floor(btc_to_trade * 100) / 100.0
            
            if btc_to_trade_rounded < 0.01:
                required_margin = (current_price * 0.01) / 2
                if margin_amount >= required_margin:
                    btc_to_trade_rounded = 0.01
                else:
                    return {"status": "error", "message": f"GMOレバレッジ最小単位(0.01)の証拠金(約{required_margin:,.0f}円)が不足しています。"}
                    
            res = self.exchange.create_order(symbol="BTC_JPY", side="SELL", execution_type="MARKET", size=btc_to_trade_rounded)
            if res.get('status') == 0:
                return {"status": "success", "message": f"実行: [TRADE EXECUTED] 🔴 証拠金 {btc_to_trade_rounded} BTC の新規空売り(Short)を発注しました！"}
            else:
                err_msg = res.get('messages', [{}])[0].get('message_string', str(res))
                return {"status": "error", "message": f"空売り発注失敗: {err_msg}"}
                
        elif action in ["CLOSE_SHORT", "CLOSE_ALL"]:
            short_size = positions_info.get("short_size", 0)
            if short_size == 0:
                return {"status": "skipped", "message": "買戻す（決済する）空売り建玉がありません。"}
                
            short_size_rounded = round(short_size, 3)
            size_str = f"{short_size_rounded:.3f}".rstrip('0').rstrip('.')
            
            res = self.exchange.close_bulk_order(symbol="BTC_JPY", side="BUY", size=size_str)
            if res.get('status') == 0:
                tag = "🛑緊急" if action == "CLOSE_ALL" else "🔴"
                return {"status": "success", "message": f"実行: [TRADE EXECUTED] {tag} 保有中の空売り建玉(Short)を全て買戻し決済しました！"}
            else:
                err_msg = res.get('messages', [{}])[0].get('message_string', str(res))
                return {"status": "error", "message": f"買戻し発注失敗: {err_msg}"}
                
        return {"status": "skipped", "message": "アクションなし"}
