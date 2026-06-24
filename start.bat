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

echo [1/7] Checking Docker daemon...

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
echo [2/7] Cleaning old containers...

docker compose down >nul 2>&1

:: ──────────────────────────────────────────────────────
:: 3. Start PostgreSQL + Redis
:: ──────────────────────────────────────────────────────

echo.
echo [3/7] Starting PostgreSQL + Redis...

docker compose --env-file .env.docker up -d postgres redis

echo      PostgreSQL running on localhost:5432
echo      Redis running on localhost:6379

:: ──────────────────────────────────────────────────────
:: 4. Wait for PostgreSQL
:: ──────────────────────────────────────────────────────

echo.
echo [4/7] Waiting for PostgreSQL...

:WAIT_PG
timeout /t 2 /nobreak >nul

docker exec tradezen-db pg_isready -U postgres >nul 2>&1

if %errorlevel% neq 0 goto WAIT_PG

echo      PostgreSQL is ready.

:: ──────────────────────────────────────────────────────
:: 5. Wait for Redis
:: ──────────────────────────────────────────────────────

echo.
echo [5/7] Waiting for Redis...

:WAIT_REDIS
timeout /t 2 /nobreak >nul

docker exec tradezen-redis redis-cli ping >nul 2>&1

if %errorlevel% neq 0 goto WAIT_REDIS

echo      Redis is ready.

:: ──────────────────────────────────────────────────────
:: 6. Run database migrations
:: ──────────────────────────────────────────────────────

echo.
echo [6/7] Running database migrations...

cd /d %~dp0apps\api && bun run migrate

if %errorlevel% neq 0 (
    cd /d %~dp0
    echo      Migration failed — please check the output above.
    pause
    exit /b 1
)

cd /d %~dp0
echo      Migrations applied.

:: ──────────────────────────────────────────────────────
:: 7. Kill existing processes on ports 3000 and 3001
:: ──────────────────────────────────────────────────────

echo.
echo      Checking for existing processes on ports 3000, 3001...

for %%p in (3000 3001) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING') do (
        taskkill /PID %%i /F >nul 2>&1 && echo      Killed process on port %%p
    )
)

:: ──────────────────────────────────────────────────────
:: Start NestJS API
:: ──────────────────────────────────────────────────────

echo.
echo      Launching API  → http://localhost:3001

start "TRADEZEN API" cmd /k ^
"cd /d %~dp0apps\api && ^
set NODE_ENV=development && ^
bun run dev"

:: Wait for API to be ready
echo      Waiting for API to be ready...

:WAIT_API
timeout /t 2 /nobreak >nul
curl -sf http://localhost:3001/api/docs >nul 2>&1
if %errorlevel% neq 0 goto WAIT_API

echo      API is ready.

:: ──────────────────────────────────────────────────────
:: Clear stale Next.js cache
:: ──────────────────────────────────────────────────────

echo.
echo      Clearing stale Next.js cache...

if exist "apps\web\.next" (
    rmdir /s /q "apps\web\.next"
    echo      Next.js cache cleared.
) else (
    echo      No stale cache found.
)

:: ──────────────────────────────────────────────────────
:: Start Next.js Web
:: ──────────────────────────────────────────────────────

echo.
echo      Launching Web  → http://localhost:3000

start "TRADEZEN WEB" cmd /k ^
"cd /d %~dp0apps\web && ^
set NODE_ENV=development && ^
bun run dev"

:: Wait for Web to be ready
echo      Waiting for Web to be ready...

:WAIT_WEB
timeout /t 2 /nobreak >nul
curl -sf http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 goto WAIT_WEB

echo      Web is ready.

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
