@echo off
cd /d d:\Antigravity\data\trade
:loop
"D:\Antigravity\data\trade\.venv\Scripts\python.exe" api_server.py
echo Server stopped or crashed. Restarting in 5 seconds...
timeout /t 5
goto loop
