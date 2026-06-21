import os
from dotenv import load_dotenv

# dotenvの読み込みは他のモジュールのインポート（OANDA_API等の読み込み）より「一番最初」に行う必要があります！
load_dotenv()

import json
import threading
import time
import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from fetchers.oanda_api import OandaAPI
from strategies.technical import calculate_macd, calculate_rsi
from strategies.fundamental import get_fear_and_greed_index
from strategies.decision_maker import generate_hybrid_signals
from execution.order_manager import OrderManager
from fetchers.tradingview_api import get_strong_signals
from utils.history_manager import load_history as load_daily_history, get_fx_trading_day

app = Flask(__name__, static_folder='dashboard')
CORS(app)

exchange = OandaAPI()
order_manager = OrderManager(exchange)

CONFIG_FILE = 'config/bot_settings.json'
HISTORY_FILE = 'data/equity_history.json'

default_settings = {
    "auto_budget_mode": "manual",
    "trade_amount_limit": 100000,
    "margin_trade_amount_limit": 200000,
    "reserved_margin_jpy": 500000,
    "entry_size_percent": 15,
    "full_position_percent": 60,
    "rsi_buy_threshold": 32,
    "rsi_sell_threshold": 70,
    "fng_stopper": 75,
    "loss_cut_percent": 1.0,
    "cooldown_minutes": 60,
    "price_drop_percent": 0.40,
    "margin_rsi_short": 75,
    "trailing_stop_percent": 0.20,
    "panic_buy_rsi": 20,
    "watch_symbols": ["USD_JPY", "EUR_JPY", "GBP_JPY", "AUD_JPY"],
    "auto_trade_enabled": True,
    "auto_symbol_select_enabled": False,
    "auto_shift_enabled": False,
    "max_nampin_count": 3,
    "daily_loss_limit": 3.0,
    "losing_streak_limit": 3,
    "losing_streak_pause_minutes": 60,
    "spread_filter_enabled": True,
    "skip_reason_log_enabled": True,
    "mtf_filter_mode": "mode_based",
    "dry_run": True
}

def load_settings():
    base_settings = default_settings.copy()
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                base_settings.update(loaded)
        except:
            pass
    return base_settings

def save_settings(data):
    try:
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        pass

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
    try:
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        pass

NAMPIN_STATE_FILE = 'data/nampin_state.json'

def load_nampin_state():
    if os.path.exists(NAMPIN_STATE_FILE):
        try:
            with open(NAMPIN_STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_nampin_state(data):
    try:
        os.makedirs(os.path.dirname(NAMPIN_STATE_FILE), exist_ok=True)
        with open(NAMPIN_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except:
        pass

DECISION_LOG_FILE = 'data/fx_decision_log.json'
decision_logs_cache = []

def load_decision_logs():
    global decision_logs_cache
    if os.path.exists(DECISION_LOG_FILE):
        try:
            with open(DECISION_LOG_FILE, 'r', encoding='utf-8') as f:
                decision_logs_cache = json.load(f)
        except:
            decision_logs_cache = []
    return decision_logs_cache

def save_decision_logs():
    global decision_logs_cache
    try:
        os.makedirs(os.path.dirname(DECISION_LOG_FILE), exist_ok=True)
        with open(DECISION_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(decision_logs_cache, f, indent=4, ensure_ascii=False)
    except:
        pass

def append_decision_log(log_data):
    global decision_logs_cache
    if not decision_logs_cache:
        load_decision_logs()
    
    # タイムスタンプを付与
    if "timestamp" not in log_data:
        log_data["timestamp"] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
    decision_logs_cache.insert(0, log_data)
    
    # 最大10000件保持 (約1日分以上を確保して日次集計を正確にするため)
    if len(decision_logs_cache) > 10000:
        decision_logs_cache = decision_logs_cache[:10000]
        
    # 都度保存
    save_decision_logs()

bot_settings = load_settings()
was_auto_trade = bot_settings.get("auto_trade_enabled", False)
bot_settings["auto_trade_enabled"] = False
save_settings(bot_settings)

equity_history = load_history()
last_history_time = 0

bot_state = {
    "market": {},
    "indicators": {},
    "balance": {},
    "margin": {},
    "positions": {},
    "watch_symbols": [],
    "logs": [],
    "latest_action": {},
    "trailing": {
        "margin_long_active": False,
        "margin_short_active": False,
        "margin_long_max_price": 0.0,
        "margin_short_min_price": 0.0
    },
    "nampin_counts": load_nampin_state(),
    "limits": {
        "trade_unit_map": {"safe": 10000, "normal": 25000, "aggressive": 40000, "scalping": 25000},
        "full_pos_map": {"safe": 40000, "normal": 60000, "aggressive": 80000, "scalping": 40000},
        "daily_loss_percent": 3.0
    },
    "currency_scores": []
}

def add_log(msg):
    timestamp = datetime.datetime.now().strftime('%H:%M:%S')
    bot_state["logs"].append(f"[{timestamp}] {msg}")
    if len(bot_state["logs"]) > 20:
        bot_state["logs"].pop(0)

def bg_updater():
    global last_history_time
    print("Background updater thread started...")
    last_tv_check_time = 0
    
    while True:
        try:
            if bot_settings.get("auto_symbol_select_enabled", False):
                now_ts = time.time()
                # 15分(900秒)おきにTradingViewをチェック
                if now_ts - last_tv_check_time > 900:
                    last_tv_check_time = now_ts
                    add_log("🤖 AI: おすすめペア(強いシグナル)を探索中...")
                    
                    inst_res = exchange.get_instruments()
                    all_syms = inst_res.get("data", []) if inst_res.get("status") == 0 else []
                    
                    if all_syms:
                        # モードに応じたペアのフィルタリング
                        mode = bot_settings.get("auto_budget_mode", "manual")
                        safe_pairs = ["USD_JPY", "EUR_USD", "EUR_JPY", "GBP_JPY", "GBP_USD", "AUD_JPY", "AUD_USD", "NZD_JPY", "CAD_JPY"]
                        exotic_keywords = ["TRY", "ZAR", "MXN", "CZK", "PLN", "SEK", "NOK", "HKD", "SGD"]
                        
                        filtered_syms = []
                        if mode == "safe":
                            filtered_syms = [s for s in all_syms if s in safe_pairs]
                        elif mode == "normal":
                            filtered_syms = [s for s in all_syms if not any(ex in s for ex in exotic_keywords)]
                        else:
                            filtered_syms = all_syms
                            
                        if not filtered_syms: filtered_syms = safe_pairs
                        
                        tv_res = get_strong_signals(filtered_syms)
                        strong_pairs = tv_res.get("STRONG_BUY", []) + tv_res.get("STRONG_SELL", [])
                        
                        if strong_pairs:
                            # 強いシグナル上位10個でリストを完全入れ替え（常に旬なものだけにする）
                            new_watch = strong_pairs[:10]
                                
                            if sorted(new_watch) != sorted(bot_settings.get("watch_symbols", [])):
                                bot_settings["watch_symbols"] = new_watch
                                save_settings(bot_settings)
                                add_log(f"⭐ AI自動選定により監視ペアを完全更新しました ({len(new_watch)}ペア)")
                        else:
                            add_log("🤖 現在強いシグナルが出ているペアはありませんでした")

            watch_symbols = bot_settings.get("watch_symbols", ["USD_JPY"])
            if not watch_symbols: watch_symbols = ["USD_JPY"]
            
            # --- 保有中ポジションの確認 (最大1ペア制限ロジック) ---
            all_positions_resp = exchange.get_open_positions(symbol=None)
            active_symbol = None
            if all_positions_resp.get('status') == 0:
                pos_list = all_positions_resp.get('data', {}).get('list', [])
                if pos_list and len(pos_list) > 0:
                    active_symbol = pos_list[0].get('symbol')
            
            # --- 為替複数ペアの評価 (簡易的な通貨強弱・チャンス選定) ---
            best_sym = watch_symbols[0]
            best_price = 0
            best_high = 0
            best_low = 0
            best_rsi = 50.0
            best_macd = 0.0
            
            close_prices = []
            
            # --- 為替複数ペアの詳細評価と安全ガード ---
            
            # 必要な全ティッカー(対象ペア + 円換算用)をリストアップ
            req_tickers = set(watch_symbols)
            if active_symbol: req_tickers.add(active_symbol)
            for s in list(req_tickers):
                if "_" in s:
                    b, q = s.split("_")
                    if b != "JPY": req_tickers.add(f"{b}_JPY")
                    if q != "JPY": req_tickers.add(f"{q}_JPY")
            
            # API一括取得
            all_prices = exchange.get_multiple_tickers(list(req_tickers))
            
            # 取引可否の確認 (Detailed)
            inst_resp = exchange.get_instruments(detailed=True)
            inst_data_list = inst_resp.get("data", []) if inst_resp.get("status") == 0 else []
            inst_map = {inst["name"]: inst for inst in inst_data_list if isinstance(inst, dict) and "name" in inst}
            
            bot_state['limits']['daily_loss_percent'] = float(bot_settings.get("daily_loss_percent", 3.0))
            
            # --- 初期起動時のOANDA取引可否ログ出力 ---
            if not globals().get("_startup_logged") and inst_map:
                print("\n=== 初期起動 OANDA取引可否チェック ===")
                print(f"現在の監視ペア:")
                for s in watch_symbols:
                    print(f" * {s}")
                print("\nOANDA instruments照合結果:")
                excluded = []
                for s in watch_symbols:
                    is_tradeable = (s in inst_map)
                    print(f" * {s}: tradeable={is_tradeable}")
                    if not is_tradeable: excluded.append(s)
                print("\n取引不可除外:")
                if excluded:
                    for e in excluded: print(f" * {e}")
                else:
                    print(" * なし")
                print("========================================\n")
                globals()["_startup_logged"] = True

            currency_scores = []
            system_warnings = []
            
            # 評価対象リスト（詳細レポートのために全監視ペアを評価）
            eval_list = list(watch_symbols)
            if active_symbol and active_symbol not in eval_list:
                eval_list.append(active_symbol)
            
            for sym in watch_symbols:
                info = inst_map.get(sym)
                if inst_map and info is None:
                    system_warnings.append(f"{sym} はこのOANDA口座では取引不可のため、自動選定対象から除外されています")
            
            bot_state['system_warnings'] = system_warnings
            
            best_sym_candidate = None
            best_rsi_diff = -1
            best_sym_data = {}

            # モード設定等の取得
            mode = bot_settings.get("auto_budget_mode", "normal")
            trade_unit_limit = bot_state['limits']['trade_unit_map'].get(mode, 25000)
            full_pos_limit = bot_state['limits']['full_pos_map'].get(mode, 60000)
            
            # 予算計算
            margin_resp = exchange.get_margin_balance()
            total_margin = 1000000
            if margin_resp.get('status') == 0:
                data = margin_resp.get('data', {})
                total_margin = float(data.get('availableAmount') or 0) + float(data.get('actualProfitLoss') or 0)
                if total_margin <= 0: total_margin = 1000000
                
            entry_pct = bot_settings.get("entry_budget_percent", 15) / 100.0
            full_pct = bot_settings.get("full_position_percent", 60) / 100.0
            margin_trade_amount_limit = bot_settings.get("margin_trade_amount_limit", 200000)
            
            invest_amount = margin_trade_amount_limit * entry_pct
            full_amount = margin_trade_amount_limit * full_pct
            
            daily_loss_limit = margin_trade_amount_limit * (bot_state['limits']['daily_loss_percent'] / 100.0)
            
            LEVERAGE = 25
            trailing_pct = bot_settings.get("trailing_stop_percent", 0.2) / 100.0
            loss_cut_pct = bot_settings.get("loss_cut_percent", 1.0) / 100.0
            
            for sym in eval_list:
                c_score = {"symbol": sym, "status": "OK", "reason": "", "score": 0, "selected_reason": ""}
                try:
                    sym = sym.replace('/', '_').replace('-', '_')
                    if "_" not in sym:
                        raise ValueError("通貨ペアのパース失敗")
                    
                    b, q = sym.split("_")
                    c_score["symbol"] = sym
                    c_score["base"] = b
                    c_score["quote"] = q
                    
                    inst_info = inst_map.get(sym)
                    if inst_map:
                        c_score["tradeable"] = (inst_info is not None)
                    else:
                        c_score["tradeable"] = True
                    
                    if not c_score["tradeable"]:
                        c_score["status"] = "SKIP"
                        c_score["reason"] = "OANDA取引不可(tradeable=False)"
                        currency_scores.append(c_score)
                        print(f"[{sym}] OANDA取引不可のため候補除外")
                        continue
                    
                    rate = all_prices.get(sym)
                    base_jpy = all_prices.get(f"{b}_JPY") if b != "JPY" else rate
                    quote_jpy = all_prices.get(f"{q}_JPY") if q != "JPY" else 1.0
                    
                    if rate: c_score["rate"] = rate
                    if base_jpy: c_score["base_jpy"] = base_jpy
                    if quote_jpy: c_score["quote_jpy"] = quote_jpy
                    
                    if not rate or not base_jpy or not quote_jpy:
                        c_score["status"] = "SKIP"
                        c_score["reason"] = "円換算レート取得不可"
                        currency_scores.append(c_score)
                        continue
                        
                    pip_size = 0.01 if q == "JPY" else 0.0001
                    c_score["pip_size"] = pip_size
                    
                    # 1. 証拠金ベースUnitsを計算
                    margin_base_entry_units = int((invest_amount * LEVERAGE) / base_jpy) if base_jpy > 0 else 0
                    margin_base_full_units = int((full_amount * LEVERAGE) / base_jpy) if base_jpy > 0 else 0
                    
                    c_score["margin_base_entry_units"] = margin_base_entry_units
                    c_score["margin_base_full_units"] = margin_base_full_units
                    
                    loss_cut_pips = (rate * loss_cut_pct) / pip_size
                    trailing_pips = (rate * trailing_pct) / pip_size
                    c_score["trailing_pips"] = trailing_pips
                    c_score["loss_cut_pips"] = loss_cut_pips
                    
                    one_unit_pip_jpy = pip_size * quote_jpy
                    
                    loss_cut_entry_limit = daily_loss_limit * 0.5
                    loss_cut_full_limit = daily_loss_limit
                    c_score["loss_cut_entry_limit"] = loss_cut_entry_limit
                    c_score["loss_cut_full_limit"] = loss_cut_full_limit
                    c_score["daily_loss_limit"] = daily_loss_limit
                    
                    # 2. 損失許容額からリスク許容Unitsを計算
                    risk_base_entry_units = int(loss_cut_entry_limit / (loss_cut_pips * one_unit_pip_jpy)) if (loss_cut_pips * one_unit_pip_jpy) > 0 else 0
                    risk_base_full_units = int(loss_cut_full_limit / (loss_cut_pips * one_unit_pip_jpy)) if (loss_cut_pips * one_unit_pip_jpy) > 0 else 0
                    
                    c_score["risk_base_entry_units"] = risk_base_entry_units
                    c_score["risk_base_full_units"] = risk_base_full_units
                    
                    # 4. 最終Units = min(証拠金ベースUnits, リスク許容Units, モード別安全上限Units)
                    final_entry_units = min(margin_base_entry_units, risk_base_entry_units, trade_unit_limit)
                    final_full_units = min(margin_base_full_units, risk_base_full_units, full_pos_limit)
                    
                    # フルポジfinal_unitsが初回final_unitsより小さくなる場合は、初回もフルポジ以下に制限
                    if final_full_units < final_entry_units:
                        final_entry_units = final_full_units
                        
                    # OANDAの tradeUnitsPrecision に合わせて切り捨て
                    precision = inst_info.get("displayPrecision", 0) if inst_info else 0
                    final_entry_units = int(final_entry_units)
                    final_full_units = int(final_full_units)
                    
                    c_score["entry_units"] = final_entry_units
                    c_score["full_units"] = final_full_units
                    
                    adjustment_reason = ""
                    if final_entry_units < margin_base_entry_units:
                        adjustment_reason = f"損失許容額に合わせて {margin_base_entry_units:,} Units → {final_entry_units:,} Units に自動調整"
                    c_score["adjustment_reason"] = adjustment_reason

                    # 5. 最終Unitsで損切り想定額を再計算
                    pip_jpy_entry = final_entry_units * one_unit_pip_jpy
                    pip_jpy_full = final_full_units * one_unit_pip_jpy
                    c_score["pip_jpy"] = pip_jpy_entry
                    
                    c_score["trail_profit_entry"] = int(trailing_pips * pip_jpy_entry)
                    c_score["trail_profit_full"] = int(trailing_pips * pip_jpy_full)
                    c_score["loss_cut_entry"] = int(loss_cut_pips * pip_jpy_entry)
                    c_score["loss_cut_full"] = int(loss_cut_pips * pip_jpy_full)
                    
                    # --- 見送り条件のハードストップ ---
                    min_trade_size = int(inst_info.get("minimumTradeSize", 1)) if inst_info else 1
                    
                    if final_entry_units < min_trade_size:
                        c_score["status"] = "SKIP"
                        c_score["reason"] = f"実発注予定Unitsが最小注文数量({min_trade_size})未満"
                    elif inst_info and not c_score["tradeable"]:
                        c_score["status"] = "SKIP"
                        c_score["reason"] = "OANDA取引不可(tradeable=False)"
                    elif pip_jpy_entry > 1000:
                        c_score["status"] = "SKIP"
                        c_score["reason"] = "1pips損益異常"
                    elif c_score["loss_cut_entry"] > loss_cut_entry_limit:
                        c_score["status"] = "SKIP"
                        c_score["reason"] = "初回損切り想定額過大"
                    elif c_score["loss_cut_full"] > loss_cut_full_limit:
                        c_score["status"] = "SKIP"
                        c_score["reason"] = "フルポジ損切り想定額過大"
                    
                    # Fetch Spread
                    spread_res = exchange.get_spread(sym)
                    spread_pips = spread_res.get('data', {}).get('spread_pips', 0.0) if spread_res.get('status') == 0 else 999.0
                    c_score["spread_pips"] = spread_pips
                    
                    # Fetch Klines for RSI/MACD scoring
                    best_rsi = 50.0
                    best_macd = 0.0
                    cps = []
                    if c_score["status"] == "OK":
                        klines_resp = exchange.get_klines(symbol=sym, interval='M5', count=50)
                        if klines_resp.get('status') == 0:
                            data_list = klines_resp.get('data', [])
                            if len(data_list) > 30:
                                cps = [float(candle['close']) for candle in data_list]
                                rsis = calculate_rsi(cps)
                                macds, _, hists = calculate_macd(cps)
                                best_rsi = rsis[-1] if rsis[-1] is not None else 50.0
                                best_macd = hists[-1] if hists[-1] is not None else 0.0
                                
                                c_score["rsi"] = best_rsi
                                c_score["macd"] = best_macd
                                rsi_diff = abs(best_rsi - 50.0)
                                c_score["score"] = rsi_diff
                                
                                # 選定理由生成
                                reasons = []
                                if best_rsi < 35 or best_rsi > 65: reasons.append("RSI条件クリア")
                                if spread_pips < 3.0: reasons.append("スプレッド上限内")
                                reasons.append("発注Units/損益上限内")
                                c_score["selected_reason"] = "、".join(reasons)
                                
                                if rsi_diff > best_rsi_diff:
                                    best_rsi_diff = rsi_diff
                                    best_sym_candidate = sym
                                    best_sym_data = {
                                        "price": rate,
                                        "high": rate,
                                        "low": rate,
                                        "rsi": best_rsi,
                                        "macd": best_macd,
                                        "cps": cps
                                    }
                            else:
                                c_score["status"] = "SKIP"
                                c_score["reason"] = "ローソク足不足"
                        else:
                            c_score["status"] = "SKIP"
                            c_score["reason"] = "ローソク足取得エラー"
                            
                    currency_scores.append(c_score)
                    
                except Exception as e:
                    c_score["status"] = "SKIP"
                    c_score["reason"] = f"評価エラー({str(e)})"
                    currency_scores.append(c_score)
                    
            bot_state['currency_scores'] = currency_scores
            
            # --- ターミナルログ出力 ---
            if currency_scores:
                print(f"[AI詳細レポート] {len(currency_scores)}ペア分を生成しました")
                summary_strs = []
                for s in currency_scores:
                    sym = s["symbol"]
                    status = s["status"]
                    summary_strs.append(f"{sym} {status}")
                print(f"[AI詳細レポート] " + " / ".join(summary_strs))
            else:
                print("[AI詳細レポート ERROR] currency_scores生成失敗: 理由 不明なエラーまたはペア未設定")
            if active_symbol:
                best_sym = active_symbol
                sd = next((c for c in currency_scores if c["symbol"] == active_symbol), None)
                if sd and sd["status"] == "OK":
                    best_price = sd["rate"]
                    best_high = sd["rate"]
                    best_low = sd["rate"]
                    best_rsi = sd.get("rsi", 50.0)
                    best_macd = sd.get("macd", 0.0)
                    close_prices = best_sym_data.get("cps", [])
            else:
                if best_sym_candidate:
                    best_sym = best_sym_candidate
                    best_price = best_sym_data["price"]
                    best_high = best_sym_data["high"]
                    best_low = best_sym_data["low"]
                    best_rsi = best_sym_data["rsi"]
                    best_macd = best_sym_data["macd"]
                    close_prices = best_sym_data["cps"]
                else:
                    tradeable_syms = [s for s in watch_symbols if inst_map.get(s, {}).get("tradeable", True)]
                    if not tradeable_syms:
                        bot_state['indicators']['latest_skip_reason'] = "取引可能な監視ペアがありません。監視ペアをOANDA取引可能ペアに変更してください。"
                        print("🤖 [AI警告] 取引可能な監視ペアがありません。OANDA取引可能ペアに変更してください。")
                        best_sym = watch_symbols[0] if watch_symbols else "USD_JPY"
                    else:
                        best_sym = tradeable_syms[0]
                    best_price = 0.0
                    
            bot_state['market']['btc_price'] = best_price
            bot_state['market']['high'] = best_high
            bot_state['market']['low'] = best_low
            bot_state['market']['symbol'] = best_sym
            bot_state['indicators']['rsi'] = best_rsi
            bot_state['indicators']['macd_hist'] = best_macd
            bot_state['watch_symbols'] = bot_settings.get("watch_symbols", [])
            
            # (UI表示用にペア名をログに少し混ぜるなど)
            
            # --- 残高・建玉情報の取得 ---
            margin_resp = exchange.get_margin_balance()
            positions_resp = exchange.get_open_positions(best_sym)
            balance_resp = exchange.get_balance()
            
            # 【絶対安全装置】OANDAのAPIエラー等でポジション取得に失敗した場合は、二重発注を防ぐためこの回の評価をスキップ
            if positions_resp.get('status') != 0:
                time.sleep(5)
                continue
            
            spot_jpy = 0.0
            if balance_resp.get('status') == 0:
                for asset in balance_resp.get('data', []):
                    if asset['symbol'] == 'JPY': spot_jpy = float(asset.get('available') or 0)
            
            # FXシステムへの移行のため、現物の仮想通貨残高(spot_btc)は0固定とする
            bot_state['balance'] = {"jpy": spot_jpy, "btc": 0.0, "btc_value": 0.0}
            
            actual_profit_loss = 0
            available_amount = 0
            margin_ratio = 9999
            
            if margin_resp.get('status') == 0:
                data = margin_resp.get('data', {})
                actual_profit_loss = float(data.get('actualProfitLoss') or 0)
                available_amount = float(data.get('availableAmount') or 0)
                margin_ratio = float(data.get('marginRatio') or 9999)
                
            long_size = 0.0
            short_size = 0.0
            long_pnl = 0.0
            short_pnl = 0.0
            unrealized_pnl = 0
            if positions_resp.get('status') == 0:
                positions_data = positions_resp.get('data', {})
                positions_list = positions_data.get('list', []) if isinstance(positions_data, dict) else []
                for p in positions_list:
                    size = float(p.get('size') or 0)
                    pnl = float(p.get('lossGain') or 0)
                    unrealized_pnl += pnl
                    if p.get('side') == 'BUY':
                        long_size += size
                        long_pnl += pnl
                    elif p.get('side') == 'SELL':
                        short_size += size
                        short_pnl += pnl
                        
            positions_info = {
                "long_size": long_size,
                "short_size": short_size,
                "unrealized_pnl": unrealized_pnl,
                "margin_ratio": margin_ratio,
                "symbol": best_sym
            }
            
            bot_state['margin']['actual_profit_loss'] = actual_profit_loss
            bot_state['margin']['available_amount'] = available_amount
            bot_state['margin']['margin_ratio'] = margin_ratio
            bot_state['margin']['unrealized_pnl'] = unrealized_pnl
            bot_state['positions']['long_size'] = long_size
            bot_state['positions']['short_size'] = short_size
            bot_state['positions']['long_pnl'] = long_pnl
            bot_state['positions']['short_pnl'] = short_pnl
            
            current_time = time.time()
            
            # --- MTF (1時間足) 分析 ---
            macro_trend = "NEUTRAL"
            klines_1h = exchange.get_klines(symbol=best_sym, interval='H1', count=50)
            if klines_1h.get('status') == 0:
                data_list_1h = klines_1h.get('data', [])
                if len(data_list_1h) >= 30:
                    close_prices_1h = [float(candle['close']) for candle in data_list_1h]
                    _, _, hists_1h = calculate_macd(close_prices_1h)
                    latest_macd_hist_1h = hists_1h[-1] if hists_1h[-1] is not None else 0.0
                    if latest_macd_hist_1h > 0:
                        macro_trend = "UP"
                    elif latest_macd_hist_1h < 0:
                        macro_trend = "DOWN"
            bot_state['indicators']['macro_trend'] = macro_trend
            
            # --- MTF (15分足) 分析 ---
            macro_trend_m15 = "NEUTRAL"
            klines_15m = exchange.get_klines(symbol=best_sym, interval='M15', count=50)
            if klines_15m.get('status') == 0:
                data_list_15m = klines_15m.get('data', [])
                if len(data_list_15m) >= 30:
                    close_prices_15m = [float(candle['close']) for candle in data_list_15m]
                    _, _, hists_15m = calculate_macd(close_prices_15m)
                    latest_macd_hist_15m = hists_15m[-1] if hists_15m[-1] is not None else 0.0
                    if latest_macd_hist_15m > 0:
                        macro_trend_m15 = "UP"
                    elif latest_macd_hist_15m < 0:
                        macro_trend_m15 = "DOWN"
            
            # --- スプレッド取得 ---
            spread_res = exchange.get_spread(best_sym)
            current_spread = spread_res.get('data', {}).get('spread_pips', 0.0) if spread_res.get('status') == 0 else 0.0
            
            # --- Daily History (PNL & Streak) ---
            daily_hist_full = load_daily_history()
            today_str = get_fx_trading_day()
            today_hist = daily_hist_full.get(today_str, {"pnl": 0.0, "trades": 0, "losing_streak": 0})

            
            # --- AUTO BUDGET ADJUSTMENT ---
            auto_mode = bot_settings.get("auto_budget_mode", "manual")
            if auto_mode in ["safe", "normal", "aggressive"]:
                total_for_calc = bot_state['margin']['available_amount'] + bot_state['margin']['unrealized_pnl']
                if total_for_calc <= 0: total_for_calc = 1000000
                minMarginLimit = 150000
                
                if auto_mode == "safe":
                    p_mlimit = max(minMarginLimit, total_for_calc * 0.50)
                elif auto_mode == "normal":
                    p_mlimit = max(minMarginLimit, total_for_calc * 0.70)
                else: # aggressive
                    p_mlimit = max(minMarginLimit, total_for_calc * 0.90)
                
                p_mlimit = int((p_mlimit // 10000) * 10000)
                
                if bot_settings.get("margin_trade_amount_limit") != p_mlimit:
                    bot_settings["margin_trade_amount_limit"] = p_mlimit
                    save_settings(bot_settings)
                    add_log(f"🔄 [AUTO予算調整] 証拠金変動に伴い予算枠を最適化しました (FX上限:{p_mlimit}円)")

            if current_time - last_history_time >= 900:  
                last_history_time = current_time
                timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
                
                spot_val = bot_state['balance']['jpy'] + bot_state['balance']['btc_value']
                fx_val = bot_state['margin']['unrealized_pnl']
                total_val = spot_val + fx_val
                
                equity_history.append({
                    "time": timestamp, 
                    "total": total_val,
                    "spot": spot_val,
                    "fx": fx_val
                })
                save_history(equity_history)
            
            fng_score = 50 
            bot_state['indicators']['fng'] = fng_score
            
            is_auto = bot_settings.get("auto_trade_enabled", True)
            
            bot_state['indicators']['auto_shift_status'] = "NONE"
            bot_state['indicators']['shift_level'] = 0
            
            # --- ナンピン回数の厳密管理 ---
            if "nampin_counts" not in bot_state:
                bot_state["nampin_counts"] = load_nampin_state()
            if best_sym not in bot_state["nampin_counts"]:
                bot_state["nampin_counts"][best_sym] = {"long": 0, "short": 0}
            
            nampin_changed = False
            if long_size == 0 and bot_state["nampin_counts"][best_sym]["long"] != 0:
                bot_state["nampin_counts"][best_sym]["long"] = 0
                nampin_changed = True
            if short_size == 0 and bot_state["nampin_counts"][best_sym]["short"] != 0:
                bot_state["nampin_counts"][best_sym]["short"] = 0
                nampin_changed = True
            if nampin_changed:
                save_nampin_state(bot_state["nampin_counts"])
            
            if is_auto:
                signals = generate_hybrid_signals(
                    best_price, best_rsi, best_macd, fng_score, 
                    bot_state['balance'], bot_state['margin'], 
                    positions_info, bot_settings, bot_state.get('latest_action', {}),
                    bot_state.get('trailing', {}), macro_trend, close_prices,
                    macro_trend_m15, current_spread, today_hist, best_sym, bot_state["nampin_counts"]
                )
                shift_info = signals.get("shift_info", {})
                if shift_info:
                    bot_state['indicators']['auto_shift_status'] = shift_info.get("status", "NONE")
                    bot_state['indicators']['shift_level'] = shift_info.get("level", 0)
            else:
                signals = {"margin": {"action": "HOLD"}, "spot": {"action": "HOLD"}}
            
            # --- 🔴 FXエンジンの処理 ---
            margin_signal = signals.get("margin", {"action": "HOLD"})
            
            # --- 見送り理由の集計とログ出力 ---
            if "skip_reasons" not in bot_state: bot_state["skip_reasons"] = {}
            if margin_signal["action"] == "HOLD":
                reason_text = "待機中"
                if "【見送り】" in margin_signal.get("reason", ""):
                    reason_text = margin_signal["reason"].split("【見送り】")[1].strip()
                elif best_sym_candidate is None and currency_scores:
                    reason_text = currency_scores[0].get("reason", "条件未達")
                
                if reason_text != "待機中":
                    bot_state["skip_reasons"][reason_text] = bot_state["skip_reasons"].get(reason_text, 0) + 1
                    bot_state['indicators']['latest_skip_reason'] = reason_text
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 🤖 [AI判定SKIP] 発注見送り理由: {reason_text}")
                
                # --- AI判定・安全判定・見送りログ記録 ---
                best_c_score_log = next((s for s in currency_scores if s["symbol"] == best_sym), {})
                skip_log = {
                    "log_type": "AI判定" if reason_text == "待機中" else "見送り",
                    "symbol": best_sym,
                    "watch_symbols": bot_settings.get("watch_symbols", []),
                    "direction": margin_signal.get("action", "HOLD").replace("OPEN_", "").replace("CLOSE_", ""),
                    "rsi": best_rsi,
                    "macd": best_macd,
                    "mtf_trend": macro_trend,
                    "spread": current_spread,
                    "final_decision": margin_signal.get("action", "HOLD"),
                    "skip_reason": reason_text,
                    "safety": {
                        "tradeable": best_c_score_log.get("tradeable", True),
                        "rate_ok": "rate" in best_c_score_log,
                        "margin_units": best_c_score_log.get("margin_base_entry_units", 0),
                        "risk_units": best_c_score_log.get("risk_base_entry_units", 0),
                        "limit_units": bot_state['limits']['trade_unit_map'].get(bot_settings.get("auto_budget_mode", "normal"), 25000),
                        "final_units": best_c_score_log.get("entry_units", 0),
                        "estimated_loss": best_c_score_log.get("loss_cut_entry", 0),
                        "allowed_loss": best_c_score_log.get("loss_cut_entry_limit", 0),
                        "daily_loss_limit": best_c_score_log.get("daily_loss_limit", 0),
                        "is_safe": best_c_score_log.get("status") == "OK",
                        "ng_reason": best_c_score_log.get("reason", "")
                    }
                }
                append_decision_log(skip_log)

            if margin_signal["action"] != "HOLD":
                if margin_signal["action"] == "TRAILING_START":
                    side = margin_signal.get("side", "margin_long")
                    if side == "margin_long":
                        bot_state["trailing"]["margin_long_active"] = True
                        bot_state["trailing"]["margin_long_max_price"] = margin_signal["price"]
                    else:
                        bot_state["trailing"]["margin_short_active"] = True
                        bot_state["trailing"]["margin_short_min_price"] = margin_signal["price"]
                    add_log(f"[{best_sym}] 🔴 トレイリング開始: {margin_signal['reason']}")
                elif margin_signal["action"] == "TRAILING_UPDATE":
                    side = margin_signal.get("side", "margin_long")
                    if side == "margin_long":
                        bot_state["trailing"]["margin_long_max_price"] = margin_signal["price"]
                    else:
                        bot_state["trailing"]["margin_short_min_price"] = margin_signal["price"]
                else:
                    # 最終的な発注Unitsを信号に含める
                    best_c_score = next((s for s in currency_scores if s["symbol"] == best_sym), None)
                    if best_c_score:
                        margin_signal["final_units"] = best_c_score.get("entry_units", 0)
                        margin_signal["c_score"] = best_c_score
                        
                    margin_res = order_manager.execute_margin_signal(margin_signal, best_price, available_amount, positions_info, bot_settings)
                    if margin_res.get("status") == "success":
                        add_log(f"[{best_sym}] {margin_res['message']}")
                        
                        details = margin_res.get("details")
                        if details and margin_signal["action"] in ["OPEN_LONG", "OPEN_SHORT"]:
                            direction = "ロング(買い)" if margin_signal["action"] == "OPEN_LONG" else "ショート(売り)"
                            log_text = (
                                f"📝 [発注シミュレーション] {best_sym} {direction}\n"
                                f"　- 使用予定予算: {details['invest_amount']:,}円\n"
                                f"　- 現在レート: {details['rate']}\n"
                                f"　- 発注数量: {details['units']:,} Units\n"
                                f"　- 1pips概算損益: 約{details['pip_jpy']:,}円\n"
                                f"　- トレイリング到達利益: 約{details['trailing_amount']:,}円\n"
                                f"　- 絶対防衛ライン損失: 約-{details['loss_cut_amount']:,}円"
                            )
                            add_log(log_text)
                            
                        # --- DRY RUN / 発注ログ記録 ---
                        is_dry_run = bot_settings.get("dry_run", True)
                        action_type = margin_signal.get("action", "UNKNOWN")
                        log_type = "決済" if "CLOSE" in action_type else ("DRY RUN" if is_dry_run else "発注")
                        
                        order_log = {
                            "log_type": log_type,
                            "symbol": best_sym,
                            "watch_symbols": bot_settings.get("watch_symbols", []),
                            "direction": action_type.replace("OPEN_", "").replace("CLOSE_", ""),
                            "rsi": best_rsi,
                            "macd": best_macd,
                            "mtf_trend": macro_trend,
                            "spread": current_spread,
                            "final_decision": action_type,
                            "order": {
                                "is_dry_run": is_dry_run,
                                "real_executed": not is_dry_run,
                                "units": details.get("units", best_c_score.get("entry_units", 0)) if details else 0,
                                "est_loss": details.get("loss_cut_amount", 0) if details else 0,
                                "allowed_loss": best_c_score.get("loss_cut_entry_limit", 0) if best_c_score else 0,
                                "message": margin_res.get("message", "")
                            },
                            "real_order": {
                                "oanda_id": margin_res.get("order_id", ""),
                                "exec_price": details.get("rate", best_price) if details else best_price,
                                "units": details.get("units", 0) if details else 0,
                                "direction": action_type,
                                "success": True,
                                "fail_reason": ""
                            }
                        }
                        append_decision_log(order_log)

                        if margin_signal["action"] == "OPEN_LONG":
                            if long_size > 0: 
                                bot_state["nampin_counts"][best_sym]["long"] += 1
                                save_nampin_state(bot_state["nampin_counts"])
                            bot_state['latest_action']['margin_long_time'] = time.time()
                            bot_state['latest_action']['margin_long_price'] = best_price
                        elif margin_signal["action"] == "OPEN_SHORT":
                            if short_size > 0: 
                                bot_state["nampin_counts"][best_sym]["short"] += 1
                                save_nampin_state(bot_state["nampin_counts"])
                            bot_state['latest_action']['margin_short_time'] = time.time()
                            bot_state['latest_action']['margin_short_price'] = best_price
                        elif margin_signal["action"] in ["CLOSE_LONG", "CLOSE_SHORT", "CLOSE_ALL"]:
                            bot_state["trailing"]["margin_long_active"] = False
                            bot_state["trailing"]["margin_short_active"] = False
                    elif margin_res.get("status") == "error":
                        add_log(f"[ERROR/FX] [{best_sym}] 発注エラー: {margin_res['message']}")
                        
                        err_log = {
                            "log_type": "エラー",
                            "symbol": best_sym,
                            "direction": margin_signal.get("action", "UNKNOWN"),
                            "real_order": {
                                "success": False,
                                "fail_reason": margin_res.get("message", "")
                            }
                        }
                        append_decision_log(err_log)
                        if margin_signal["action"] == "OPEN_LONG":
                            bot_state['latest_action']['margin_long_time'] = time.time()
                            bot_state['latest_action']['margin_long_price'] = best_price
                        elif margin_signal["action"] == "OPEN_SHORT":
                            bot_state['latest_action']['margin_short_time'] = time.time()
                            bot_state['latest_action']['margin_short_price'] = best_price
                    else:
                        if margin_signal["action"] == "CLOSE_ALL":
                            add_log(f"[WARNING/FX] [{best_sym}] {margin_signal['reason']}")
                        else:
                            add_log(f"🔴 [FX AI] [{best_sym}] {margin_signal['reason']}")
            
        except Exception as e:
            import traceback
            tb_str = traceback.format_exc()
            add_log(f"[ERROR] システムエラーが発生しました: {str(e)}")
            append_decision_log({
                "log_type": "エラー",
                "real_order": {"fail_reason": f"システムエラー: {str(e)}"}
            })
            with open(r"C:\Users\user\AppData\Local\Temp\fx_debug.log", "a", encoding="utf-8") as f:
                f.write(f"[{datetime.datetime.now().isoformat()}] {tb_str}\n")
        
        time.sleep(10) # API負荷を考慮して10秒おき

@app.route('/api/status', methods=['GET'])
def get_status():
    daily_history = {}
    today_hist = {"pnl": 0.0, "trades": 0, "losing_streak": 0}
    try:
        from utils.history_manager import load_history, get_fx_trading_day
        daily_history = load_history()
        today = get_fx_trading_day()
        today_hist = daily_history.get(today, {"pnl": 0.0, "trades": 0, "losing_streak": 0})
    except Exception as e:
        pass
        
    res = bot_state.copy()
    res["today_hist"] = today_hist
    res["is_dry_run"] = bot_settings.get("dry_run", True)
    return jsonify(res)

@app.route('/api/force_close', methods=['POST'])
def api_force_close():
    data = request.json
    side = data.get('side', '')
    if side == 'LONG':
        res = order_manager.force_close_margin_long()
        if res:
            return jsonify({"status": "success", "message": "ロング建玉を決済しました"})
    elif side == 'SHORT':
        res = order_manager.force_close_margin_short()
        if res:
            return jsonify({"status": "success", "message": "ショート建玉を決済しました"})
    return jsonify({"status": "error", "message": "決済に失敗したか建玉がありません"})

@app.route('/api/save_screenshot', methods=['POST'])
def save_screenshot():
    data = request.json
    image_data = data.get('image', '')
    if image_data.startswith('data:image/png;base64,'):
        image_data = image_data.replace('data:image/png;base64,', '')
    
    try:
        import base64
        import os
        from datetime import datetime
        
        save_dir = os.path.join(os.getcwd(), 'screenshots')
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
            
        filename = f"KawaseChan_Snapshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(save_dir, filename)
        
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(image_data))
            
        # UIにフルパスを返す
        return jsonify({"status": "success", "path": os.path.abspath(filepath)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/force_close_legacy', methods=['POST'])
def force_close():
    global bot_state
    symbol = bot_state['market'].get('symbol')
    if not symbol:
        return jsonify({"status": "error", "message": "監視中の通貨ペアが不明です"})
        
    data = request.json or {}
    side = data.get('side', 'ALL') 
    
    action = "CLOSE_" + side
    if action == "CLOSE_LONG":
        margin_signal = {"action": "CLOSE_LONG", "reason": "ユーザーの手動操作によりロングポジションを強制決済しました。"}
    elif action == "CLOSE_SHORT":
        margin_signal = {"action": "CLOSE_SHORT", "reason": "ユーザーの手動操作によりショートポジションを強制決済しました。"}
    else:
        margin_signal = {"action": "CLOSE_ALL", "reason": "ユーザーの手動操作により全ポジションを強制決済しました。"}
        
    positions_info = {
        "long_size": bot_state['positions']['long_size'],
        "short_size": bot_state['positions']['short_size'],
        "symbol": symbol
    }
    
    current_price = bot_state['market']['btc_price']
    available_amount = bot_state['margin']['available_amount']
    
    margin_res = order_manager.execute_margin_signal(margin_signal, current_price, available_amount, positions_info, bot_settings)
    
    if margin_res.get("status") == "success":
        add_log(f"[{symbol}] 🛑 【手動決済】 {margin_signal['reason']}")
        bot_state["trailing"]["margin_long_active"] = False
        bot_state["trailing"]["margin_short_active"] = False
        return jsonify({"status": "success", "message": "ポジションを手動で決済しました"})
    else:
        add_log(f"[ERROR/FX] [{symbol}] 手動決済エラー: {margin_res.get('message', 'Unknown error')}")
        return jsonify({"status": "error", "message": margin_res.get('message', 'Unknown error')})

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify(equity_history)

@app.route('/api/instruments', methods=['GET'])
def get_instruments():
    from fetchers.oanda_api import OandaAPI
    oanda = OandaAPI()
    res = oanda.get_instruments()
    if res['status'] == 0:
        return jsonify({"instruments": res['data']})
    else:
        return jsonify({"instruments": ["USD_JPY", "EUR_JPY", "GBP_JPY", "AUD_JPY"]})

@app.route('/api/settings', methods=['GET'])
def get_bot_settings():
    return jsonify(bot_settings)

@app.route('/api/settings', methods=['POST'])
def update_bot_settings():
    global bot_settings
    data = request.json
    for key in default_settings.keys():
        if key in data:
            if key in ["price_drop_percent", "trailing_stop_percent"]:
                bot_settings[key] = float(data[key])
            elif key == "watch_symbols":
                bot_settings[key] = list(data[key])
            elif key == "auto_budget_mode":
                bot_settings[key] = str(data[key])
            elif key in ["auto_trade_enabled", "auto_symbol_select_enabled", "auto_shift_enabled"]:
                bot_settings[key] = bool(data[key])
            else:
                bot_settings[key] = int(data[key])
    
    save_settings(bot_settings)
    add_log(f"⚙️ ダッシュボードよりAIシステムパラメーターが自動更新されました！")
    return jsonify({"status": "success", "settings": bot_settings})

@app.route('/api/decision_logs', methods=['GET'])
def get_decision_logs():
    logs = load_decision_logs()
    return jsonify({"status": "success", "data": logs[:100]})

@app.route('/api/daily_summary', methods=['GET'])
def get_daily_summary():
    logs = load_decision_logs()
    import datetime
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    today_logs = [log for log in logs if log.get("timestamp", "").startswith(today_str)]
    
    ai_decisions = len([log for log in today_logs if log.get("log_type") in ["AI判定", "見送り", "DRY RUN", "発注", "決済"]])
    skips = len([log for log in today_logs if log.get("final_decision") == "HOLD"])
    
    skip_reasons = {}
    for log in today_logs:
        if log.get("final_decision") == "HOLD":
            reason = log.get("skip_reason", "不明")
            skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
            
    dry_runs = len([log for log in today_logs if log.get("log_type") == "DRY RUN"])
    real_orders = len([log for log in today_logs if log.get("log_type") == "発注"])
    
    # 本日の確定損益や連敗数は get_status() の today_hist と同様に取得
    today_hist = {"pnl": 0.0, "trades": 0, "losing_streak": 0}
    try:
        from utils.history_manager import load_history, get_fx_trading_day
        daily_history = load_history()
        today = get_fx_trading_day()
        today_hist = daily_history.get(today, {"pnl": 0.0, "trades": 0, "losing_streak": 0})
    except Exception:
        pass

    summary = {
        "ai_decisions": ai_decisions,
        "skips": skips,
        "skip_reasons": skip_reasons,
        "dry_runs": dry_runs,
        "real_orders": real_orders,
        "pnl": today_hist.get("pnl", 0.0),
        "losing_streak": today_hist.get("losing_streak", 0)
    }
    from flask import jsonify, send_from_directory, request
    return jsonify({"status": "success", "data": summary})

@app.route('/')
def index():
    from flask import send_from_directory
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    from flask import send_from_directory
    return send_from_directory(app.static_folder, path)

@app.route('/api/frontend_error', methods=['POST'])
def handle_frontend_error():
    from flask import request, jsonify
    try:
        data = request.json
        print("\n" + "="*50)
        print("[FRONTEND ERROR REPORT]")
        print(f"Message: {data.get('message')}")
        print(f"Source: {data.get('source')} (Line: {data.get('lineno')}, Col: {data.get('colno')})")
        print(f"Stack:\n{data.get('stack')}")
        print("="*50 + "\n")
        return jsonify({"status": "success"})
    except:
        return jsonify({"status": "error"}), 400

if __name__ == '__main__':
    import threading
    t = threading.Thread(target=bg_updater, daemon=True)
    t.start()
    print("=========================================")
    print("OANDA FX Dashboard is running! (AI Linked - LEVERAGE MODE)")
    print("Local Access: http://127.0.0.1:5050/")
    print("=========================================")
    app.run(host='0.0.0.0', port=5050, debug=False)
