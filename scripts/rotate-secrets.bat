@echo off
REM ── TradeZen Secret Rotation Script (Windows) ───────────────────────────────
REM Purpose: Rotate all secrets after a leak or periodic security review.
REM WARNING: This invalidates all existing sessions (users must re-login).

echo ===========================================
echo   TradeZen Secret Rotation Tool
echo ===========================================
echo.

REM ── 1. Generate New Secrets ─────────────────────────────────────────────────
echo [1/5] Generating new secrets...
REM Requires OpenSSL (comes with Git Bash, WSL, or install separately)
for /f "delims=" %%a in ('openssl rand -base64 64') do set NEW_JWT_SECRET=%%a
for /f "delims=" %%a in ('openssl rand -base64 64') do set NEW_JWT_REFRESH_SECRET=%%a
for /f "delims=" %%a in ('openssl rand -base64 32') do set NEW_DB_PASSWORD=%%a

echo   Generated JWT_SECRET (64 chars)
echo   Generated JWT_REFRESH_SECRET (64 chars)
echo   Generated DB_PASSWORD (32 chars)

REM ── 2. Backup Current .env.docker ───────────────────────────────────────────
echo.
echo [2/5] Backing up current environment file...

if exist ".env.docker" (
  copy ".env.docker" ".env.docker.backup.%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
  echo   Backed up to .env.docker.backup.timestamp
) else (
  echo ERROR: .env.docker not found! Create it first.
  exit /b 1
)

REM ── 3. Update .env.docker ────────────────────────────────────────────────────
echo.
echo [3/5] Updating .env.docker with new secrets...

REM Replace DB_PASSWORD
powershell -Command "(Get-Content '.env.docker') -replace '^DB_PASSWORD=.*', 'DB_PASSWORD=%NEW_DB_PASSWORD%' | Set-Content '.env.docker'"

REM Replace JWT_SECRET
powershell -Command "(Get-Content '.env.docker') -replace '^JWT_SECRET=.*', 'JWT_SECRET=%NEW_JWT_SECRET%' | Set-Content '.env.docker'"

REM Replace JWT_REFRESH_SECRET
powershell -Command "(Get-Content '.env.docker') -replace '^JWT_REFRESH_SECRET=.*', 'JWT_REFRESH_SECRET=%NEW_JWT_REFRESH_SECRET%' | Set-Content '.env.docker'"

echo   .env.docker updated

REM ── 4. Restart Docker Services ───────────────────────────────────────────────
echo.
echo [4/5] Restarting Docker services...

docker-compose --env-file .env.docker down
docker-compose --env-file .env.docker up -d postgres

echo   Waiting for Postgres to be ready...
:waitloop
timeout /t 1 /nobreak >nul
docker-compose exec -T postgres pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
  goto waitloop
)

echo   Postgres is ready

REM Update Postgres password
docker-compose exec -T postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD '%NEW_DB_PASSWORD%';"

echo   Services restarted with new credentials

REM ── 5. CI/CD Secret Updates ─────────────────────────────────────────────────
echo.
echo [5/5] CI/CD Secret Updates Required
echo *******************************************************
echo IMPORTANT: Manually update the following GitHub Secrets:
echo https://github.com/tampered-sin/Tradezen/settings/secrets/actions
echo.
echo   Secret Name              ^ New Value
echo   -------------------------^--------------------------------
echo   JWT_SECRET               ^ %NEW_JWT_SECRET:~0,30%...
echo   JWT_REFRESH_SECRET       ^ %NEW_JWT_REFRESH_SECRET:~0,30%...
echo   DB_PASSWORD              ^ %NEW_DB_PASSWORD:~0,30%...
echo.
echo Also update Render/Railway environment variables if deployed.
echo.
echo Secret rotation complete!
echo.
echo Next steps:
echo   1. Update GitHub Secrets (see above)
echo   2. Redeploy to production (git push to main)
echo   3. Notify users they need to re-login
echo.
pause
