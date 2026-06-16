import os
import threading
import webview
import time
from api_server import app, bg_updater

def start_flask():
    # サーバーを固定の5050番ポートで起動
    app.run(host='127.0.0.1', port=5050, debug=False, use_reloader=False)

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
mutex = ctypes.windll.kernel32.CreateMutexW(None, False, "Kawasechan_App_Mutex_Lock")
if ctypes.windll.kernel32.GetLastError() == 183: # ERROR_ALREADY_EXISTS
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    messagebox.showerror("起動エラー", "かわせちゃんは既に起動しています！\n（二重起動はできません）")
    root.destroy()
    sys.exit()

if __name__ == '__main__':
    print("かわせちゃん初号機 自動売買システムを起動しています...")
    
    # バックグラウンド処理（サーバーとAI）を起動
    start_background_tasks()
    
    # サーバーが立ち上がるまで少し待機
    time.sleep(2)
    
    print("[APP LAUNCHER] pywebviewウインドウ起動開始")
    print("[APP LAUNCHER] URL: http://127.0.0.1:5050")
    
    try:
        print("[APP LAUNCHER] pywebviewウインドウ起動開始")
        print("[APP LAUNCHER] URL: http://127.0.0.1:5050")
        try:
            window = webview.create_window(
                title='かわせちゃん初号機 - OANDA専用 為替FX自動売買AIシステム',
                url='http://127.0.0.1:5050',
                width=1280,
                height=900,
                resizable=True,
                text_select=True,
                background_color='#0a0b10' # ダッシュボードの背景色に合わせる
            )
            
            print("[APP LAUNCHER] pywebview.start 実行")
            # ウィンドウの起動（このメソッドはウィンドウが閉じられるまでブロックする）
            webview.start(debug=False)
            print("システムを終了しました。")
        except Exception as e:
            print(f"[APP LAUNCHER ERROR] pywebview起動失敗: {e}")
    except Exception as e:
        print(f"[APP LAUNCHER ERROR] pywebview起動失敗: {e}")
