import json
import os

history_file = r'd:\Antigravity\data\trade\data\equity_history.json'
if os.path.exists(history_file):
    with open(history_file, 'r') as f:
        data = json.load(f)
    
    for d in data:
        if d.get('spot', 0) > 700000:
            d['spot'] = d['spot'] - 500000
            
    with open(history_file, 'w') as f:
        json.dump(data, f)
    print("History fixed.")
else:
    print("No history file.")
