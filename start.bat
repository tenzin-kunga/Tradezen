@echo off
title TRADEZEN — Startup
color 0A

echo.
echo  ===================================================
echo   TRADEZEN // CARBON LEDGER — Starting Services
echo  ===================================================
echo.

:: ── 1. Start Docker Desktop if not running ──────────────────────────
echo [1/4] Checking Docker daemon...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo      Docker not running — launching Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo      Waiting for Docker daemon to be ready...
    :WAIT_DOCKER
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto WAIT_DOCKER
    echo      Docker daemon ready.
) else (
    echo      Docker daemon already running.
)

:: ── 2. Start PostgreSQL + Redis via Docker Compose ──────────────────
echo.
echo [2/4] Starting PostgreSQL + Redis (docker-compose)...
docker-compose up -d
echo      PostgreSQL running on localhost:5432
echo      Redis running on localhost:6379

:: ── 3. Wait for Postgres to accept connections ───────────────────────
echo.
echo [3/4] Waiting for Postgres to accept connections...
:WAIT_PG
timeout /t 2 /nobreak >nul
docker exec tradezen-db pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 goto WAIT_PG
echo      Postgres is ready.

:: ── 4. Start API (NestJS) in new window ─────────────────────────────
echo.
echo [4/4] Starting services...
echo      Launching API  on http://localhost:3001
start "TRADEZEN API" cmd /k "cd /d %~dp0apps\api && npm run start:dev"

:: ── 5. Start Web (Next.js) in new window ─────────────────────────────
:: Check if something is using port 3000 and kill it
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :3000') do (
        taskkill /PID %%i /F
    )
)
echo      Launching Web  on http://localhost:3000
start "TRADEZEN WEB" cmd /k "cd /d %~dp0apps\web && npm run dev"

echo.
echo  ===================================================
echo   All services launched. Close this window anytime.
echo  ===================================================
echo.
pause
