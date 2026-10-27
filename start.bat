@echo off
title TraceNest Launcher
echo ======================================================
echo           Starting TraceNest Platform...
echo ======================================================

echo [1/3] Ensuring Docker services (MongoDB, Redis, API, Worker) are running...
docker compose up -d api worker

echo [2/3] Starting React Dashboard (Port 5173)...
start "TraceNest Dashboard" cmd /k "cd /d %~dp0dashboard && npm.cmd run dev"

echo [3/3] Starting Demo App Traffic Generator (Port 4000)...
start "TraceNest Demo App" cmd /k "cd /d %~dp0demo-app && npm.cmd start"

timeout /t 3 /nobreak >nul
echo Opening Dashboard in browser...
start http://localhost:5173

echo ======================================================
echo   TraceNest is running!
echo   - Dashboard: http://localhost:5173 (demo@tracenest.dev / secret123)
echo   - Demo App:  http://localhost:4000
echo   - API:       http://localhost:3000
echo   To stop all services, run stop.bat
echo ======================================================
pause
