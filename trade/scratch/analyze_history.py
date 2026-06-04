import json
import datetime
from fetchers.market_data import GMOCoinAPI

def analyze():
    with open('data/equity_history.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if not data:
        print("No data found.")
        return

    # Parse timestamps
    parsed_data = []
    for item in data:
        t_str = item['time']
        # Handle "YYYY-MM-DD HH:MM" or just "HH:MM" (though data shows full dates)
        try:
            dt = datetime.datetime.strptime(t_str, "%Y-%m-%d %H:%M")
            parsed_data.append({'dt': dt, 'total': item.get('total', item.get('value', 0))})
        except Exception as e:
            pass
            
    parsed_data.sort(key=lambda x: x['dt'])
    
    total_running_seconds = 0
    for i in range(1, len(parsed_data)):
        diff = (parsed_data[i]['dt'] - parsed_data[i-1]['dt']).total_seconds()
        # If interval is less than or equal to 60 minutes, count it as running
        if diff <= 3600:
            total_running_seconds += diff
            
    running_hours = total_running_seconds / 3600.0
    running_days = running_hours / 24.0
    
    start_dt = parsed_data[0]['dt']
    end_dt = parsed_data[-1]['dt']
    total_calendar_days = (end_dt - start_dt).total_seconds() / 3600.0 / 24.0
    
    print(f"Start: {start_dt}")
    print(f"End: {end_dt}")
    print(f"Calendar Duration: {total_calendar_days:.2f} days")
    print(f"Pure Running Time: {running_days:.2f} days ({running_hours:.1f} hours)")
    print(f"Uptime: {running_days/total_calendar_days*100:.1f}%")
    
    # Fetch BTC prices
    api = GMOCoinAPI()
    
    # Start price
    date_str = start_dt.strftime('%Y%m%d')
    start_kline = api.get_klines(symbol='BTC_JPY', interval='1hour', date=date_str)
    
    start_price = None
    if start_kline.get('status') == 0:
        klines = start_kline.get('data', [])
        if klines:
            # Find the closest kline to start_dt
            closest_kline = klines[0]
            start_price = float(closest_kline['open'])
            print(f"Found historical start price: {start_price}")
    
    if not start_price:
        print("Could not fetch exact start price, using a fallback or current price for testing.")
        
    # Current price
    ticker = api.get_ticker(symbol='BTC_JPY')
    current_price = None
    if ticker.get('status') == 0:
        current_price = float(ticker['data'][0]['last'])
        print(f"Current BTC price: {current_price}")
        
    if start_price and current_price:
        initial_jpy = 100000.0
        btc_bought = initial_jpy / start_price
        buy_hold_value = btc_bought * current_price
        
        bot_value = parsed_data[-1]['total']
        
        print("\n--- Performance Comparison ---")
        print(f"Initial Investment: ¥{initial_jpy:,.0f}")
        print(f"Buy & Hold Value:   ¥{buy_hold_value:,.0f} ({(buy_hold_value/initial_jpy - 1)*100:.1f}%)")
        print(f"Cryptokun Value:    ¥{bot_value:,.0f} ({(bot_value/initial_jpy - 1)*100:.1f}%)")

if __name__ == '__main__':
    analyze()
