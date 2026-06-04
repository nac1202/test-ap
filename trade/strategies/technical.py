# strategies/technical.py

def calculate_sma(prices, period):
    """単純移動平均 (Simple Moving Average) を計算する"""
    if len(prices) < period:
        return [None] * len(prices)
    
    sma = [None] * (period - 1)
    for i in range(period - 1, len(prices)):
        window = prices[i - period + 1 : i + 1]
        sma.append(sum(window) / period)
    return sma

def calculate_ema(prices, period):
    """指数平滑移動平均 (Exponential Moving Average) を計算する"""
    if len(prices) < period:
        return [None] * len(prices)
    
    ema = [None] * (period - 1)
    initial_sma = sum(prices[:period]) / period
    ema.append(initial_sma)
    
    multiplier = 2 / (period + 1)
    for i in range(period, len(prices)):
        current_ema = (prices[i] - ema[-1]) * multiplier + ema[-1]
        ema.append(current_ema)
        
    return ema

def calculate_macd(prices, fast_period=12, slow_period=26, signal_period=9):
    """
    MACD (Moving Average Convergence Divergence) を計算する
    戻り値: macd_line, signal_line, histogram の各リスト
    """
    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)
    
    macd_line = []
    for f, s in zip(fast_ema, slow_ema):
        if f is None or s is None:
            macd_line.append(None)
        else:
            macd_line.append(f - s)
            
    valid_macd = [x for x in macd_line if x is not None]
    if len(valid_macd) < signal_period:
        signal_line = [None] * len(macd_line)
    else:
        valid_signal = calculate_ema(valid_macd, signal_period)
        padding = [None] * (len(macd_line) - len(valid_signal))
        signal_line = padding + valid_signal
        
    histogram = []
    for m, s in zip(macd_line, signal_line):
        if m is None or s is None:
            histogram.append(None)
        else:
            histogram.append(m - s)
            
    return macd_line, signal_line, histogram

def calculate_rsi(prices, period=14):
    """RSI (Relative Strength Index) を計算する"""
    if len(prices) <= period:
        return [None] * len(prices)
        
    rsi_list = [None] * period
    
    gains = []
    losses = []
    for i in range(1, period + 1):
        change = prices[i] - prices[i-1]
        if change > 0:
            gains.append(change)
        else:
            losses.append(abs(change))
            
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    
    if avg_loss == 0:
        rsi_list.append(100)
    else:
        rs = avg_gain / avg_loss
        rsi_list.append(100 - (100 / (1 + rs)))
        
    for i in range(period + 1, len(prices)):
        change = prices[i] - prices[i-1]
        gain = change if change > 0 else 0
        loss = abs(change) if change < 0 else 0
        
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        
        if avg_loss == 0:
            rsi_list.append(100)
        else:
            rs = avg_gain / avg_loss
            rsi_list.append(100 - (100 / (1 + rs)))
            
    return rsi_list
