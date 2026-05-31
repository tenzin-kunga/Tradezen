@echo off
title TRADEZEN — Startup
color 0A

echo.
echo  ===================================================
echo   TRADEZEN // CARBON LEDGER — Starting Services
echo  ===================================================
echo.

:: ──────────────────────────────────────────────────────
:: 1. Start Docker Desktop if not running
:: ──────────────────────────────────────────────────────

echo [1/5] Checking Docker daemon...

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

:: ──────────────────────────────────────────────────────
:: 2. Clean old containers (prevents stale networks)
:: ──────────────────────────────────────────────────────

echo.
echo [2/5] Cleaning old containers...

docker compose down >nul 2>&1

:: ──────────────────────────────────────────────────────
:: 3. Start PostgreSQL + Redis
:: ──────────────────────────────────────────────────────

echo.
echo [3/5] Starting PostgreSQL + Redis...

docker compose --env-file .env.docker up -d postgres redis

echo      PostgreSQL running on localhost:5432
echo      Redis running on localhost:6379

:: ──────────────────────────────────────────────────────
:: 4. Wait for PostgreSQL
:: ──────────────────────────────────────────────────────

echo.
echo [4/5] Waiting for PostgreSQL...

:WAIT_PG
timeout /t 2 /nobreak >nul

docker exec tradezen-db pg_isready -U postgres >nul 2>&1

if %errorlevel% neq 0 goto WAIT_PG

echo      PostgreSQL is ready.

:: ──────────────────────────────────────────────────────
:: 5. Wait for Redis
:: ──────────────────────────────────────────────────────

echo.
echo [5/5] Waiting for Redis...

:WAIT_REDIS
timeout /t 2 /nobreak >nul

docker exec tradezen-redis redis-cli ping >nul 2>&1

if %errorlevel% neq 0 goto WAIT_REDIS

echo      Redis is ready.

:: ──────────────────────────────────────────────────────
:: Kill existing process on port 3000
:: ──────────────────────────────────────────────────────

echo.
echo      Checking for existing processes on port 3000...

netstat -ano | findstr :3000 >nul

if %errorlevel% equ 0 (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr LISTENING ^| findstr :3000') do (
        taskkill /PID %%i /F >nul 2>&1
    )

    echo      Existing port 3000 process terminated.
)

:: ──────────────────────────────────────────────────────
:: Start NestJS API
:: ──────────────────────────────────────────────────────

echo.
echo      Launching API  → http://localhost:3001

start "TRADEZEN API" cmd /k ^
"cd /d %~dp0apps\api && ^
set NODE_ENV=development && ^
npm run dev"

:: ──────────────────────────────────────────────────────
:: Start Next.js Web
:: ──────────────────────────────────────────────────────

echo.
echo      Launching Web  → http://localhost:3000

start "TRADEZEN WEB" cmd /k ^
"cd /d %~dp0apps\web && ^
set NODE_ENV=development && ^
npm run dev"

echo.
echo  ===================================================
echo   TradeZen development environment is ready.
echo  ===================================================
echo.
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:3001
echo   Swagger  : http://localhost:3001/api/docs
echo.
pause
