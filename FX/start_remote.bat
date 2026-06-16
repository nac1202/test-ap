@echo off
chcp 65001 > nul
echo ==========================================
echo OANDA FX Dashboard 外部アクセス用トンネル
echo ==========================================
echo.
echo 【準備中...】
echo 少し待つと、画面の中央付近に
echo 「https://xxxx-xxxx-xxxx.trycloudflare.com」
echo というURLが表示されます。
echo.
echo そのURLをスマホのブラウザに入力すれば、
echo 外出先からでも4G/5G回線でアクセス可能です！
echo.
echo ※ この黒い画面を閉じるとスマホから見れなくなります。
echo ==========================================
echo.
cloudflared.exe tunnel --url http://127.0.0.1:5050
pause
