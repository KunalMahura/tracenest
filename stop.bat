@echo off
title TraceNest Stopper
echo ======================================================
echo           Stopping TraceNest Platform...
echo ======================================================

echo Stopping Docker containers...
docker compose stop

echo Closing node processes for Dashboard and Demo App...
taskkill /FI "WINDOWTITLE eq TraceNest Dashboard*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq TraceNest Demo App*" /F /T >nul 2>&1

echo ======================================================
echo   TraceNest stopped successfully.
echo ======================================================
pause
