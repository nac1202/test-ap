import requests

def get_fear_and_greed_index():
    """
    仮想通貨市場の心理を示すFear & Greed Indexを取得します。
    戻り値: (数値スコア(0-100), 状態を示す文字列)
    ※ スコアが低いほど極度の恐怖(売られすぎ=買い時かも)、高いほど強気(買われすぎ=警戒)
    """
    try:
        response = requests.get('https://api.alternative.me/fng/?limit=1', timeout=5)
        data = response.json()
        if 'data' in data and len(data['data']) > 0:
            score = int(data['data'][0]['value'])
            classification = data['data'][0]['value_classification']
            return score, classification
    except Exception as e:
        # 外部APIの障害を見越して、エラー時はエラーを伝播させずニュートラル(50)をフェールセーフとして返す
        print(f"Error fetching fundamental data: {e}")
        
    return 50, "Neutral"
