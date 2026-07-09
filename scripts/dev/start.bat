@echo off
setlocal EnableDelayedExpansion
title TRADEZEN — Startup
color 0A

:: ── Resolve project root (works from any cwd / double-click) ──
cd /d "%~dp0..\.."
set "ROOT=%CD%"

echo.
echo  ===================================================
echo   TRADEZEN // CARBON LEDGER — Starting Services
echo  ===================================================
echo.

:: ── 1. Docker daemon ───────────────────────────────────────
echo [1/8] Checking Docker daemon...

docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo      Docker daemon already running.
    goto DOCKER_READY
)

echo      Docker not running — launching Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo      Waiting for Docker daemon to be ready...

set "DOCKER_TRIES=0"
:WAIT_DOCKER
set /a DOCKER_TRIES+=1
if %DOCKER_TRIES% gtr 60 (
    echo.
    echo ========================================
    echo Timed out waiting for Docker daemon.
    echo Docker Desktop may have failed to start.
    echo ========================================
    pause
    exit /b 1
)
echo      Waiting for Docker daemon... (%DOCKER_TRIES%/60)
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if %errorlevel% neq 0 goto WAIT_DOCKER

:DOCKER_READY
echo ✓ Docker daemon ready

:: ── 2. Start PostgreSQL + Redis ─────────────────────────────
echo.
echo [2/8] Starting PostgreSQL + Redis...

docker compose --file "%ROOT%\infra\docker-compose.yml" --env-file "%ROOT%\.env.docker" up -d postgres redis

if errorlevel 1 (
    echo.
    echo ========================================
    echo Failed to start Docker services.
    echo Check Docker Desktop and the compose configuration.
    echo ========================================
    pause
    exit /b 1
)

echo      PostgreSQL on localhost:5432
echo      Redis on localhost:6379
echo ✓ Docker services started

:: ── 3. Wait for PostgreSQL (bounded) ────────────────────────
echo.
echo [3/8] Waiting for PostgreSQL...

docker inspect tradezen-db >nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo PostgreSQL container was never created.
    echo Check the Docker Compose configuration.
    echo ========================================
    pause
    exit /b 1
)

set "PG_TRIES=0"
:WAIT_PG
set /a PG_TRIES+=1
if %PG_TRIES% gtr 60 (
    echo.
    echo ========================================
    echo Timed out waiting for PostgreSQL.
    echo Docker may have failed to start the database.
    echo ========================================
    pause
    exit /b 1
)
echo      Waiting for PostgreSQL... (%PG_TRIES%/60)
timeout /t 2 /nobreak >nul
docker exec tradezen-db pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 goto WAIT_PG
echo ✓ PostgreSQL ready

:: ── 4. Wait for Redis (bounded) ─────────────────────────────
echo.
echo [4/8] Waiting for Redis...

docker inspect tradezen-redis >nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo Redis container was never created.
    echo Check the Docker Compose configuration.
    echo ========================================
    pause
    exit /b 1
)

set "REDIS_TRIES=0"
:WAIT_REDIS
set /a REDIS_TRIES+=1
if %REDIS_TRIES% gtr 60 (
    echo.
    echo ========================================
    echo Timed out waiting for Redis.
    echo Docker may have failed to start Redis.
    echo ========================================
    pause
    exit /b 1
)
echo      Waiting for Redis... (%REDIS_TRIES%/60)
timeout /t 2 /nobreak >nul
docker exec tradezen-redis redis-cli ping >nul 2>&1
if %errorlevel% neq 0 goto WAIT_REDIS
echo ✓ Redis ready

:: ── 5. Ollama (lightweight, no auto-pull) ──────────────────
echo.
echo [5/8] Checking Ollama...

tasklist /FI "IMAGENAME eq ollama.exe" 2>nul | findstr /I "ollama.exe" >nul 2>&1
if %errorlevel% neq 0 (
    echo      Ollama not running — starting...
    :: Default per-user install location; override with OLLAMA_EXE if different.
    if not defined OLLAMA_EXE set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    start "" "%OLLAMA_EXE%"
    timeout /t 3 /nobreak >nul
    echo      Ollama started.
) else (
    echo      Ollama already running.
)

curl -sf http://localhost:11434/api/tags > "%TEMP%\tz_ollama_tags.txt" 2>nul
if %errorlevel% neq 0 (
    echo      Warning: Ollama not responding on localhost:11434
    goto SKIP_MODELS
)
echo ✓ Ollama is ready.
echo      Checking required models...
set "MISSED="
findstr /I /C:"qwen3:latest" "%TEMP%\tz_ollama_tags.txt" >nul 2>&1
if errorlevel 1 set "MISSED=1"
findstr /I /C:"nomic-embed-text" "%TEMP%\tz_ollama_tags.txt" >nul 2>&1
if errorlevel 1 set "MISSED=1"
if defined MISSED call :PRINT_MODELS
if exist "%TEMP%\tz_ollama_tags.txt" del "%TEMP%\tz_ollama_tags.txt" >nul 2>&1
goto SKIP_MODELS
:PRINT_MODELS
echo.
echo      AI model(s) not installed.
echo.
echo      Run:
echo          ollama pull qwen3:latest
echo          ollama pull nomic-embed-text
echo.
echo      AI features will remain unavailable until the models are installed.
goto :eof
:SKIP_MODELS

:: ── 6. Run database migrations (fail-fast) ──────────────────
echo.
echo [6/8] Running database migrations...

pushd "%ROOT%\apps\api" || exit /b 1
bun run migrate
set "MIGRATE_ERR=%errorlevel%"
popd

if %MIGRATE_ERR% neq 0 (
    echo.
    echo ========================================
    echo Migration failed — please check the output above.
    echo ========================================
    pause
    exit /b 1
)
echo ✓ Database migrated

:: ── 7. Kill existing processes on ports 3000/3001/8000 ──────
echo.
echo [7/8] Stopping existing processes...

for %%p in (3000 3001 8000) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING') do (
        taskkill /PID %%i /F >nul 2>&1 && echo      Killed process on port %%p
    )
)
echo ✓ Ports cleared

:: ── 8. Launch all services as tabs in one terminal ──────────
echo.
echo [8/8] Launching all services in one terminal window (one tab each)...
echo.
echo  ===================================================
echo   TRADEZEN — Ready
echo  ===================================================
echo.
echo   Frontend   : http://localhost:3000
echo   Backend    : http://localhost:3001
echo   AI Service : http://localhost:8000
echo   Ollama     : http://localhost:11434
echo   Swagger    : http://localhost:3001/api/docs
echo.
echo   Tabs: API | Web | AI Service
echo   Close all:   Ctrl+Shift+W
echo.

wt new-tab --title "API" cmd /k "cd /d %ROOT%\apps\api && set NODE_ENV=development && bun run dev" ^
    ; new-tab --title "Web" cmd /k "cd /d %ROOT%\apps\web && set NODE_ENV=development && bun run dev" ^
    ; new-tab --title "AI Service" cmd /k "cd /d %ROOT%\apps\ai-service && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
