import threading
import webview
import time
from api_server import app, bg_updater

def start_flask():
    # サーバーを固定の5000番ポートで起動
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

def start_background_tasks():
    # api_serverのバックグラウンド更新スレッドを起動
    t1 = threading.Thread(target=bg_updater, daemon=True)
    t1.start()
    
    # Flaskサーバーを別スレッドで起動
    t2 = threading.Thread(target=start_flask, daemon=True)
    t2.start()

import ctypes
import sys
import tkinter as tk
from tkinter import messagebox

# 二重起動防止
mutex = ctypes.windll.kernel32.CreateMutexW(None, False, "Cryptokun_App_Mutex_Lock")
if ctypes.windll.kernel32.GetLastError() == 183: # ERROR_ALREADY_EXISTS
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    messagebox.showerror("起動エラー", "くりぷとくんは既に起動しています！\n（二重起動はできません）")
    root.destroy()
    sys.exit()

if __name__ == '__main__':
    print("Starting Cryptokun Automated Trading System...")
    
    # バックグラウンド処理（サーバーとAI）を起動
    start_background_tasks()
    
    # サーバーが立ち上がるまで少し待機
    time.sleep(2)
    
    # 固定URL（5000番）でウィンドウを作成
    window = webview.create_window(
        title='くりぷとくん初号機 - GMOコイン専用 プレミアム自動売買AIシステム',
        url='http://127.0.0.1:5000',
        width=1280,
        height=900,
        resizable=True,
        text_select=True,
        background_color='#0a0b10'
    )
    
    # ウィンドウの起動（このメソッドはウィンドウが閉じられるまでブロックする）
    webview.start(debug=False)
    
    print("System Shutdown.")
