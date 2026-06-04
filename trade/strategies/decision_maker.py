def generate_hybrid_signals(current_price, rsi, macd_hist, sentiment_score, spot_balance=None, margin_balance=None, positions_info=None, settings=None, latest_action=None, trailing_state=None, macro_trend="NEUTRAL", close_prices=None):
    """
    MTF（マルチタイムフレーム）と心理指標を融合した最強のハイブリッド判定ロジック
    """
    if spot_balance is None: spot_balance = {"jpy": 0, "btc": 0}
    if margin_balance is None: margin_balance = {"unrealized_pnl": 0}
    if positions_info is None: positions_info = {"short_size": 0.0}
    if settings is None: settings = {}
    if latest_action is None: latest_action = {}
    if trailing_state is None: trailing_state = {"spot_active": False, "spot_max_price": 0, "margin_active": False, "margin_min_price": 0}

    # ------------------------------------------
    # 追加フィルター用データの計算
    # ------------------------------------------
    short_sma = current_price
    recent_high = current_price
    recent_low = current_price
    
    if close_prices and len(close_prices) >= 20:
        # 過去20本（100分）の高値・安値
        recent_20 = close_prices[-20:]
        recent_high = max(recent_20)
        recent_low = min(recent_20)
        
        # 過去5本（25分）の短期SMA
        recent_5 = close_prices[-5:]
        short_sma = sum(recent_5) / len(recent_5)

    trade_limit = settings.get("trade_amount_limit", 100000)
    rsi_buy = settings.get("rsi_buy_threshold", 45)
    rsi_sell = settings.get("rsi_sell_threshold", 70)
    fng_stopper = settings.get("fng_stopper", 75)
    trailing_percent = settings.get("trailing_stop_percent", 1.0) / 100.0
    
    # 連続エントリー防衛・ナンピン幅設定 (時間、価格幅)
    cooldown_seconds = settings.get("cooldown_minutes", 60) * 60  # デフォルト60分
    price_drop_percent = settings.get("price_drop_percent", 1.5) / 100.0  # デフォルト1.5%幅
    current_time = __import__('time').time()

    if current_price <= 0:
        return {"spot": {"action": "HOLD", "reason": "待機"}, "margin": {"action": "HOLD", "reason": "待機"}}

    # ==========================================
    # 1. 🟢 現物 (SPOT) チーム判定 (ロング・利確)
    # ==========================================
    spot_signal = {"action": "HOLD", "reason": "待機"}
    current_btc = spot_balance.get("btc", 0)
    current_jpy = spot_balance.get("jpy", 0)
    current_spot_value = current_btc * current_price
    
    is_spot_full = current_spot_value >= (trade_limit * (settings.get("full_position_percent", 85) / 100.0))

    # --- 🟢 現物 トレイリングストップ処理 ---
    if current_btc >= 0.0001:
        if trailing_state.get("spot_active"):
            # トレイリング中
            if current_price > trailing_state.get("spot_max_price", 0):
                spot_signal = {"action": "TRAILING_UPDATE", "side": "spot", "price": current_price}
            elif current_price <= trailing_state.get("spot_max_price", current_price) * (1 - trailing_percent):
                spot_signal = {"action": "SELL_SPOT", "reason": f"トレイリングストップ発動。最高値から{trailing_percent*100}%下落したため利益確定(売却)します。"}
            else:
                spot_signal = {"action": "HOLD", "reason": f"トレイリングストップ追従中 (最高値: {trailing_state.get('spot_max_price'):.0f})"}
        elif rsi >= rsi_sell:
            # トレイリング発動
            spot_signal = {"action": "TRAILING_START", "side": "spot", "price": current_price, "reason": f"RSI過熱域({rsi:.1f})到達。トレイリングストップを起動し利益を追従します。"}
    
    # トレイリング系以外のアクション（新規買い）
    if spot_signal["action"] == "HOLD" and not trailing_state.get("spot_active"):
        panic_buy_rsi = settings.get("panic_buy_rsi", 20)
        is_panic_buy = rsi <= panic_buy_rsi
        
        # 新規フィルター計算
        # 直近高値から1%以上下落しているか
        price_drop_from_high = (recent_high - current_price) / recent_high * 100
        is_dropped_enough = price_drop_from_high >= 1.0
        
        # SMAが下向きすぎないか (現在価格がSMAを上抜けている、またはSMAとの乖離が小さい)
        # 短期SMAより現在価格が上ならOK、下でも乖離が0.5%以内なら許容
        sma_diff = (short_sma - current_price) / short_sma * 100
        is_sma_ok = current_price > short_sma or sma_diff <= 0.5
        
        if is_panic_buy or (rsi <= rsi_buy and macd_hist > 0 and is_dropped_enough and is_sma_ok):
            if is_panic_buy:
                # パニック買い時は大局トレンドや過熱感チェックをパスする
                pass
            elif macro_trend == "DOWN":
                spot_signal = {"action": "HOLD", "reason": f"MTF警戒: 1時間足が下落トレンドのため現物買い見送り"}
            elif sentiment_score >= fng_stopper:
                spot_signal = {"action": "HOLD", "reason": f"バブル警戒域(心理:{sentiment_score})のため現物買い一時停止"}
            
            if spot_signal["action"] == "HOLD" and (is_panic_buy or (macro_trend != "DOWN" and sentiment_score < fng_stopper)):
                if is_spot_full:
                    spot_signal = {"action": "HOLD", "reason": f"現物買いシグナルですが予算上限のため待機。"}
                else:
                    invest_amount = trade_limit * (settings.get("entry_size_percent", 20) / 100.0)
                    reserved_jpy = settings.get("reserved_margin_jpy", 500000)
                    available_for_spot = max(0, current_jpy - reserved_jpy)
                    max_usable_jpy = available_for_spot * 0.90
                    actual_invest = min(invest_amount, max_usable_jpy)
                    
                    if actual_invest < 1000 or (actual_invest / current_price) < 0.0001:
                        spot_signal = {"action": "HOLD", "reason": f"現物買いシグナルですが、日本円の利用可能残高が不足しているため待機します。"}
                    else:
                        last_buy_time = latest_action.get("spot_buy_time", 0)
                        last_buy_price = latest_action.get("spot_buy_price", 0)
                        time_passed = current_time - last_buy_time
                        price_dropped = (last_buy_price - current_price) / last_buy_price if last_buy_price > 0 else 0
                        
                        if last_buy_time > 0 and time_passed < cooldown_seconds and price_dropped < price_drop_percent:
                            mins_left = int((cooldown_seconds - time_passed) / 60)
                            spot_signal = {"action": "HOLD", "reason": f"買いシグナル点灯中ですが、連続買い制限により待機中（残り{mins_left}分、または指定下落幅未達）。"}
                        else:
                            if is_panic_buy:
                                spot_signal = {"action": "BUY_SPOT", "reason": f"【セリクラ逆張り】大暴落パニック時の超底値拾いを発動！ (RSI={rsi:.1f})"}
                            else:
                                spot_signal = {"action": "BUY_SPOT", "reason": f"RSI低水準({rsi:.1f})＋MACD陽転。底値と判定し現物を手堅く買い集めます。"}

    # ==========================================
    # 2. 🔴 FX空売り (MARGIN) チーム判定 (ショート・買戻し)
    # ==========================================
    margin_signal = {"action": "HOLD", "reason": "待機"}
    short_size = positions_info.get("short_size", 0.0)
    unrealized_pnl = margin_balance.get("unrealized_pnl", 0)
    current_short_value = short_size * current_price
    
    margin_trade_limit = settings.get("margin_trade_amount_limit", 200000)
    is_margin_full = current_short_value >= (margin_trade_limit * (settings.get("full_position_percent", 85) / 100.0))
    
    # 【最優先】絶対防衛ライン・強制損切りチェック
    loss_cut_percent = settings.get("loss_cut_percent", 5) / 100.0
    loss_cut_jpy = margin_trade_limit * loss_cut_percent 
    if unrealized_pnl < -loss_cut_jpy and short_size > 0:
        margin_signal = {"action": "CLOSE_ALL", "reason": f"【絶対防衛ライン】含み損が最大許容範囲を超過。破産防止のためFX空売り建玉を緊急成行決済します！"}
    else:
        margin_rsi_short = settings.get("margin_rsi_short", 60)
        
        # --- 🔴 FX トレイリングストップ処理 ---
        if short_size >= 0.005:
            if trailing_state.get("margin_active"):
                # トレイリング中
                if current_price < trailing_state.get("margin_min_price", current_price):
                    margin_signal = {"action": "TRAILING_UPDATE", "side": "margin", "price": current_price}
                elif current_price >= trailing_state.get("margin_min_price", current_price) * (1 + trailing_percent):
                    margin_signal = {"action": "CLOSE_SHORT", "reason": f"トレイリングストップ発動。最安値から{trailing_percent*100}%反発したためショートを買い戻し利益確定します。"}
                else:
                    margin_signal = {"action": "HOLD", "reason": f"ショート トレイリング追従中 (最安値: {trailing_state.get('margin_min_price'):.0f})"}
            elif rsi <= rsi_buy:
                # トレイリング発動
                margin_signal = {"action": "TRAILING_START", "side": "margin", "price": current_price, "reason": f"RSI低水準({rsi:.1f})到達。ショートのトレイリングストップを起動し利益を追従します。"}
        
        # トレイリング系以外のアクション（新規空売り）
        if margin_signal["action"] == "HOLD" and not trailing_state.get("margin_active"):
            
            # 新規フィルター計算
            # 価格が短期移動平均を下抜けしたか
            is_below_sma = current_price < short_sma
            # 直近安値を割ったか
            is_breakdown = current_price <= recent_low * 1.002 # わずかなバッファ(0.2%)を許容
            
            if rsi >= (margin_rsi_short + 10) or (rsi >= margin_rsi_short and macd_hist < 0 and is_below_sma and is_breakdown):
                if macro_trend == "UP":
                    margin_signal = {"action": "HOLD", "reason": f"MTF警戒: 1時間足が上昇トレンドのため、逆張りの空売りを一時見送ります。"}
                elif is_margin_full:
                    margin_signal = {"action": "HOLD", "reason": f"空売りシグナルですがFX予算上限のため待機。"}
                else:
                    invest_amount = margin_trade_limit * (settings.get("entry_size_percent", 20) / 100.0)
                    available_amount = margin_balance.get("available_amount", 0)
                    actual_invest = min(invest_amount, available_amount)
                    required_margin = (current_price * 0.01) / 2
                    
                    if actual_invest < 1000 or available_amount < required_margin:
                        margin_signal = {"action": "HOLD", "reason": f"空売りシグナルですが、FX証拠金が不足しているため待機します。"}
                    else:
                        last_short_time = latest_action.get("margin_short_time", 0)
                        last_short_price = latest_action.get("margin_short_price", 0)
                        time_passed = current_time - last_short_time
                        price_raised = (current_price - last_short_price) / last_short_price if last_short_price > 0 else 0
                        
                        fx_cooldown_seconds = settings.get("fx_cooldown_minutes", settings.get("cooldown_minutes", 15)) * 60
                        fx_price_drop_percent = settings.get("fx_price_drop_percent", settings.get("price_drop_percent", 0.5)) / 100.0
                        
                        if last_short_time > 0 and time_passed < fx_cooldown_seconds and price_raised < fx_price_drop_percent:
                            mins_left = int((fx_cooldown_seconds - time_passed) / 60)
                            margin_signal = {"action": "HOLD", "reason": f"空売りシグナル点灯中ですが、連続出動制限により待機中（残り{mins_left}分、または指定上昇幅未達）。"}
                        else:
                            margin_signal = {"action": "OPEN_SHORT", "reason": f"RSI天井({rsi:.1f})＋MACD陰転。ハイリターンな空売りを仕掛けます。"}

    return {"spot": spot_signal, "margin": margin_signal}
