@echo off
echo Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo Starting dev server on port 3015...
set PORT=3015
npm run dev
