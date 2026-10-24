@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Please run npm install first.
  pause
  exit /b 1
)
echo Hamster Skin Studio: http://127.0.0.1:4317/
echo Press Ctrl+C to stop the server.
call npm.cmd run dev
