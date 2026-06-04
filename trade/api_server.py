import os
import json
import threading
import time
import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from fetchers.market_data import GMOCoinAPI
from strategies.technical import calculate_macd, calculate_rsi
from strategies.fundamental import get_fear_and_greed_index
from strategies.decision_maker import generate_hybrid_signals
from execution.order_manager import OrderManager
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='dashboard')
CORS(app)

exchange = GMOCoinAPI()
order_manager = OrderManager(exchange)

CONFIG_FILE = 'config/bot_settings.json'
HISTORY_FILE = 'data/equity_history.json'

default_settings = {
    "auto_budget_mode": "manual",
    "trade_amount_limit": 100000,
    "margin_trade_amount_limit": 200000,
    "reserved_margin_jpy": 500000,   # FX専用 取り置き資金
    "entry_size_percent": 20,
    "full_position_percent": 85,
    "rsi_buy_threshold": 45,
    "rsi_sell_threshold": 70,
    "fng_stopper": 75,
    "loss_cut_percent": 5,
    "cooldown_minutes": 60,         # 現物ナンピン待機時間(分)
    "fx_cooldown_minutes": 15,      # FXナンピン待機時間(分)
    "price_drop_percent": 1.5,      # 現物ナンピン下落幅(%)
    "fx_price_drop_percent": 0.5,   # FXナンピン上昇幅(%)
    "trailing_stop_percent": 1.0,   # トレイリングストップ発動幅(%)
    "panic_buy_rsi": 20             # セリクラ逆張り用RSI閾値
}

def load_settings():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return default_settings.copy()

def save_settings(data):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                today_str = datetime.datetime.now().strftime('%Y-%m-%d ')
                for item in data:
                    if len(item["time"]) <= 5: 
                        item["time"] = today_str + item["time"]
                return data
        except:
            pass
    now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    return [{"time": now_str, "value": 100000}]

def save_history(data):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

bot_settings = load_settings()
equity_history = load_history()
last_history_time = 0

bot_state = {
    "balance": {"jpy": 0, "btc": 0, "btc_value": 0},
    "margin": {"actual_profit_loss": 0, "available_amount": 0, "margin_ratio": 0, "unrealized_pnl": 0},
    "positions": {"long_size": 0.0, "short_size": 0.0},
    "market": {"btc_price": 0, "high": 0, "low": 0},
    "indicators": {"rsi": 50.0, "macd_hist": 0.0, "fng": 50},
    "logs": [
        f"[{datetime.datetime.now().strftime('%m/%d %H:%M:%S')}] 取引所APIとの通信を確立しました",
        f"[{datetime.datetime.now().strftime('%m/%d %H:%M:%S')}] 🟢🔴デュアルエンジン自動売買システム監視開始"
    ],
    "latest_action": {
        "spot_buy_time": 0, "spot_buy_price": 0,
        "margin_short_time": 0, "margin_short_price": 0
    },
    "trailing": {
        "spot_active": False,
        "spot_max_price": 0,
        "margin_active": False,
        "margin_min_price": 0
    }
}

def add_log(msg):
    timestamp = datetime.datetime.now().strftime('%m/%d %H:%M:%S')
    bot_state["logs"].append(f"[{timestamp}] {msg}")
    if len(bot_state["logs"]) > 20:
        bot_state["logs"].pop(0)

def bg_updater():
    global last_history_time
    print("Background updater thread started...")
    
    while True:
        try:
            ticker = exchange.get_ticker()
            if ticker.get('status') == 0:
                price = float(ticker['data'][0].get('last') or 0)
                bot_state['market']['high'] = float(ticker['data'][0].get('high') or price)
                bot_state['market']['low'] = float(ticker['data'][0].get('low') or price)
            else:
                price = bot_state['market']['btc_price']
            
            # --- レバレッジ証拠金・現物残高・建玉情報の取得 ---
            margin_resp = exchange.get_margin_balance()
            positions_resp = exchange.get_open_positions('BTC_JPY')
            balance_resp = exchange.get_balance()
            
            if balance_resp.get('status') == 0:
                spot_jpy, spot_btc = 0.0, 0.0
                for asset in balance_resp.get('data', []):
                    if asset['symbol'] == 'JPY': spot_jpy = float(asset.get('available') or 0)
                    if asset['symbol'] == 'BTC': spot_btc = float(asset.get('amount') or 0)
                reserved_jpy = bot_settings.get("reserved_margin_jpy", 500000)
                display_spot_jpy = max(0, spot_jpy - reserved_jpy)
                bot_state['balance'] = {"jpy": spot_jpy, "jpy_display": display_spot_jpy, "btc": spot_btc, "btc_value": spot_btc * price}
            else:
                # 通信エラー時は前回の現物BTC価格換算のみ最新値で再計算
                bot_state['balance']['btc_value'] = bot_state['balance']['btc'] * price
                if 'messages' in balance_resp:
                    print(f"Balance fetch error (keeping last data): {balance_resp['messages']}")
            
            # margin_respエラー時のためのデフォルト値
            reserved_jpy = bot_settings.get("reserved_margin_jpy", 500000)
            available_amount = min(bot_state['margin']['available_amount'], reserved_jpy)
            
            if margin_resp.get('status') == 0:
                data = margin_resp.get('data', {})
                actual_profit_loss = float(data.get('actualProfitLoss') or 0)
                raw_available = float(data.get('availableAmount') or 0)
                margin_ratio = float(data.get('marginRatio') or 9999)
                available_amount = min(raw_available, reserved_jpy) if reserved_jpy > 0 else raw_available
                
                bot_state['margin']['actual_profit_loss'] = actual_profit_loss
                bot_state['margin']['available_amount'] = available_amount
                bot_state['margin']['margin_ratio'] = margin_ratio
            else:
                if 'messages' in margin_resp:
                    print(f"Margin balance fetch error (keeping last data): {margin_resp['messages']}")
                
            long_size = bot_state['positions']['long_size']
            short_size = bot_state['positions']['short_size']
            unrealized_pnl = bot_state['margin']['unrealized_pnl']
            margin_ratio = bot_state['margin']['margin_ratio']
            
            if positions_resp.get('status') == 0:
                positions_data = positions_resp.get('data', {})
                positions_list = positions_data.get('list', []) if isinstance(positions_data, dict) else []
                long_size = 0.0
                short_size = 0.0
                unrealized_pnl = 0
                for p in positions_list:
                    size = float(p.get('size') or 0)
                    pnl = float(p.get('lossGain') or 0)
                    unrealized_pnl += pnl
                    if p.get('side') == 'BUY':
                        long_size += size
                    elif p.get('side') == 'SELL':
                        short_size += size
                        
                bot_state['margin']['unrealized_pnl'] = unrealized_pnl
                bot_state['positions']['long_size'] = long_size
                bot_state['positions']['short_size'] = short_size
            else:
                if 'messages' in positions_resp:
                    print(f"Positions fetch error (keeping last data): {positions_resp['messages']}")
            
            positions_info = {
                "long_size": long_size,
                "short_size": short_size,
                "unrealized_pnl": unrealized_pnl,
                "margin_ratio": margin_ratio
            }
            
            real_spot_val = bot_state['balance']['jpy'] + bot_state['balance']['btc_value']
            fx_val = bot_state['margin']['unrealized_pnl']
            total_val = real_spot_val + fx_val
            
            # --- AUTO BUDGET ADJUSTMENT ---
            auto_mode = bot_settings.get("auto_budget_mode", "manual")
            if auto_mode in ["safe", "normal", "aggressive"]:
                total_for_calc = total_val if total_val > 0 else 1000000
                minMarginLimit = 150000
                
                if auto_mode == "safe":
                    p_limit, p_mlimit, p_reserved = total_for_calc * 0.40, max(minMarginLimit, total_for_calc * 0.15), total_for_calc * 0.45
                elif auto_mode == "normal":
                    p_limit, p_mlimit, p_reserved = total_for_calc * 0.60, max(minMarginLimit, total_for_calc * 0.25), total_for_calc * 0.15
                else: # aggressive
                    p_limit, p_mlimit, p_reserved = total_for_calc * 0.85, max(minMarginLimit, total_for_calc * 0.40), 0
                
                p_limit = max(10000, int((p_limit // 10000) * 10000))
                p_mlimit = int((p_mlimit // 10000) * 10000)
                p_reserved = int((p_reserved // 10000) * 10000)
                
                if (bot_settings.get("trade_amount_limit") != p_limit or 
                    bot_settings.get("margin_trade_amount_limit") != p_mlimit or 
                    bot_settings.get("reserved_margin_jpy") != p_reserved):
                    bot_settings["trade_amount_limit"] = p_limit
                    bot_settings["margin_trade_amount_limit"] = p_mlimit
                    bot_settings["reserved_margin_jpy"] = p_reserved
                    save_settings(bot_settings)
                    add_log(f"🔄 [AUTO予算調整] 総資産変動に伴い予算枠を最適化しました (現物:{p_limit}円, FX:{p_mlimit}円, 防御:{p_reserved}円)")

            current_time = time.time()
            if current_time - last_history_time >= 900:  
                last_history_time = current_time
                timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
                
                display_spot_val = bot_state['balance']['jpy_display'] + bot_state['balance']['btc_value']
                
                equity_history.append({
                    "time": timestamp, 
                    "total": total_val,
                    "spot": display_spot_val,
                    "margin": fx_val
                })
                
                # 履歴上限を撤廃し無期限に蓄積
                save_history(equity_history)
            
            klines_resp = exchange.get_klines(symbol='BTC_JPY', interval='5min')
            data_list = []
            if klines_resp.get('status') == 0:
                data_list.extend(klines_resp.get('data', []))
                
            # 日付切り替わり直後のデータ不足対策 (50本未満なら前日分も取得)
            if len(data_list) < 50:
                yesterday = datetime.datetime.utcnow() + datetime.timedelta(hours=9) - datetime.timedelta(days=1)
                yesterday_str = yesterday.strftime('%Y%m%d')
                klines_resp_y = exchange.get_klines(symbol='BTC_JPY', interval='5min', date=yesterday_str)
                if klines_resp_y.get('status') == 0:
                    data_list.extend(klines_resp_y.get('data', []))
            
            if data_list:
                data_list.sort(key=lambda x: int(x['openTime']))
                close_prices = [float(candle['close']) for candle in data_list]
                
                if len(close_prices) > 30:
                    macds, signals, hists = calculate_macd(close_prices)
                    rsis = calculate_rsi(close_prices)
                    
                    latest_macd_hist = hists[-1] if hists[-1] is not None else 0.0
                    latest_rsi = rsis[-1] if rsis[-1] is not None else 50.0
                    
                    bot_state['indicators']['macd_hist'] = latest_macd_hist
                    bot_state['indicators']['rsi'] = latest_rsi
                    
            # 1時間足の取得 (MTF分析用)
            macro_trend = "NEUTRAL"
            
            if "historical_1h_klines" not in bot_state:
                bot_state["historical_1h_klines"] = []
                # 初回のみ過去10日分を取得 (MACDの精度を高めるため)
                for days_back in range(1, 10):
                    past_date = datetime.datetime.utcnow() + datetime.timedelta(hours=9) - datetime.timedelta(days=days_back)
                    klines_past = exchange.get_klines(symbol='BTC_JPY', interval='1hour', date=past_date.strftime('%Y%m%d'))
                    if klines_past.get('status') == 0:
                        bot_state["historical_1h_klines"].extend(klines_past.get('data', []))
            
            klines_1h = exchange.get_klines(symbol='BTC_JPY', interval='1hour')
            if klines_1h.get('status') == 0:
                today_data = klines_1h.get('data', [])
                
                # キャッシュと今日のデータを結合して重複排除
                combined = bot_state["historical_1h_klines"] + today_data
                unique_data = {item['openTime']: item for item in combined}
                data_list_1h = list(unique_data.values())
                
                if data_list_1h:
                    data_list_1h.sort(key=lambda x: int(x['openTime']))
                    close_prices_1h = [float(candle['close']) for candle in data_list_1h]
                    if len(close_prices_1h) >= 35:
                        _, _, hists_1h = calculate_macd(close_prices_1h)
                        latest_macd_hist_1h = hists_1h[-1] if hists_1h[-1] is not None else 0.0
                        if latest_macd_hist_1h > 0:
                            macro_trend = "UP"
                        elif latest_macd_hist_1h < 0:
                            macro_trend = "DOWN"
            bot_state['indicators']['macro_trend'] = macro_trend
            
            fng_score, fng_class = get_fear_and_greed_index()
            bot_state['indicators']['fng'] = fng_score
            
            signals = generate_hybrid_signals(
                price, 
                bot_state['indicators']['rsi'], 
                bot_state['indicators']['macd_hist'], 
                fng_score, 
                bot_state['balance'], 
                bot_state['margin'], 
                positions_info, 
                bot_settings, 
                bot_state.get('latest_action', {}), 
                bot_state.get('trailing', {}), 
                macro_trend,
                close_prices
            )
            
            # --- 🟢 現物エンジンの処理 ---
            spot_signal = signals.get("spot", {"action": "HOLD"})
            if spot_signal["action"] != "HOLD":
                if spot_signal["action"] == "TRAILING_START":
                    bot_state["trailing"]["spot_active"] = True
                    bot_state["trailing"]["spot_max_price"] = spot_signal["price"]
                    add_log(f"🟢 [現物AI] {spot_signal['reason']}")
                elif spot_signal["action"] == "TRAILING_UPDATE":
                    bot_state["trailing"]["spot_max_price"] = spot_signal["price"]
                else:
                    spot_res = order_manager.execute_spot_signal(spot_signal, price, bot_state['balance'], bot_settings)
                    if spot_res.get("status") == "success":
                        add_log(spot_res["message"])
                        if spot_signal["action"] == "BUY_SPOT":
                            bot_state['latest_action']['spot_buy_time'] = time.time()
                            bot_state['latest_action']['spot_buy_price'] = price
                        elif spot_signal["action"] == "SELL_SPOT":
                            bot_state["trailing"]["spot_active"] = False
                            bot_state["trailing"]["spot_max_price"] = 0
                    elif spot_res.get("status") == "error":
                        add_log(f"[ERROR/現物] 発注エラー: {spot_res['message']}")
                        msg_lower = spot_res['message'].lower()
                        if "不足" in msg_lower or "insufficient" in msg_lower or "margin call" in msg_lower or "マージンコール" in msg_lower or "preopen" in msg_lower or "not allowed" in msg_lower or "maintenance" in msg_lower:
                            add_log(f"【防止措置】取引不可状態(プレオープン、アカウント制限等)のため、{bot_settings.get('cooldown_minutes', 60)}分間の休止(クールダウン)に入ります。")
                            bot_state['latest_action']['spot_buy_time'] = time.time()
                            bot_state['latest_action']['spot_buy_price'] = price
                    else:
                        add_log(f"🟢 [現物AI] {spot_signal['reason']}")

            # --- 🔴 FXエンジンの処理 ---
            margin_signal = signals.get("margin", {"action": "HOLD"})
            if margin_signal["action"] != "HOLD":
                if margin_signal["action"] == "TRAILING_START":
                    bot_state["trailing"]["margin_active"] = True
                    bot_state["trailing"]["margin_min_price"] = margin_signal["price"]
                    add_log(f"🔴 [FX空売りAI] {margin_signal['reason']}")
                elif margin_signal["action"] == "TRAILING_UPDATE":
                    bot_state["trailing"]["margin_min_price"] = margin_signal["price"]
                else:
                    margin_res = order_manager.execute_margin_signal(margin_signal, price, available_amount, positions_info, bot_settings)
                    if margin_res.get("status") == "success":
                        add_log(margin_res["message"])
                        if margin_signal["action"] == "OPEN_SHORT":
                            bot_state['latest_action']['margin_short_time'] = time.time()
                            bot_state['latest_action']['margin_short_price'] = price
                        elif margin_signal["action"] in ["CLOSE_SHORT", "CLOSE_ALL"]:
                            bot_state["trailing"]["margin_active"] = False
                            bot_state["trailing"]["margin_min_price"] = 0
                    elif margin_res.get("status") == "error":
                        add_log(f"[ERROR/FX] 発注エラー: {margin_res['message']}")
                        msg_lower = margin_res['message'].lower()
                        if "不足" in msg_lower or "insufficient" in msg_lower or "margin call" in msg_lower or "マージンコール" in msg_lower or "preopen" in msg_lower or "not allowed" in msg_lower or "maintenance" in msg_lower:
                            add_log(f"【防止措置】取引不可状態(プレオープン、アカウント制限等)のため、{bot_settings.get('cooldown_minutes', 60)}分間の休止(クールダウン)に入ります。")
                            bot_state['latest_action']['margin_short_time'] = time.time()
                            bot_state['latest_action']['margin_short_price'] = price
                        elif "超過" in msg_lower:
                            add_log(f"[WARNING/FX] {margin_signal['reason']}")
                    else:
                        add_log(f"🔴 [FX空売りAI] {margin_signal['reason']} (心理={fng_score})")
            
            bot_state['market']['btc_price'] = price
            
        except Exception as e:
            add_log(f"[ERROR] システムエラーが発生しました: {str(e)}")
            print("API Server BG Error:", e)
        
        time.sleep(5)

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify(bot_state)

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify(equity_history)

@app.route('/api/settings', methods=['GET'])
def get_bot_settings():
    return jsonify(bot_settings)

@app.route('/api/settings', methods=['POST'])
def update_bot_settings():
    global bot_settings
    data = request.json
    for key in default_settings.keys():
        if key in data:
            if key in ["price_drop_percent", "fx_price_drop_percent", "trailing_stop_percent"]:
                bot_settings[key] = float(data[key])
            elif key == "auto_budget_mode":
                bot_settings[key] = str(data[key])
            else:
                bot_settings[key] = int(data[key])
                
    if 'trailing_stop_percent' in data:
        bot_settings['trailing_stop_percent'] = float(data['trailing_stop_percent'])
    if 'panic_buy_rsi' in data:
        bot_settings['panic_buy_rsi'] = int(data['panic_buy_rsi'])
    
    save_settings(bot_settings)
    add_log(f"⚙️ ダッシュボードよりAIシステムパラメーターが自動更新されました！")
    return jsonify({"status": "success", "settings": bot_settings})

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    t = threading.Thread(target=bg_updater, daemon=True)
    t.start()
    print("=========================================")
    print("Premium Dashboard is running! (AI Linked - LEVERAGE MODE)")
    print("Local Access: http://127.0.0.1:5000/")
    print("=========================================")
    app.run(host='0.0.0.0', port=5000, debug=False)
