@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==========================================
echo   Steel Agent Build Script
echo ==========================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker CLI not found. Please install Docker Desktop.
    echo   Download: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon not running.
    echo   If Docker Desktop shows Running, try:
    echo     1. Wait for Engine to turn green
    echo     2. Reopen this terminal
    echo     3. Restart Docker Desktop
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose not found.
        pause
        exit /b 1
    )
)

echo [INFO] Docker check passed
echo.

if not exist "backend\.env.production" (
    if exist "backend\.env" (
        copy "backend\.env" "backend\.env.production" >nul
    )
)

if exist "steel-agent-web\dist" rmdir /s /q "steel-agent-web\dist"

echo [INFO] Building frontend...
cd steel-agent-web

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

echo [INFO] Building app...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

cd ..

echo [INFO] Stopping old services...
docker compose down >nul 2>&1

echo [INFO] Building Docker images...
docker compose build --no-cache frontend
if errorlevel 1 (
    echo [ERROR] Frontend image build failed
    pause
    exit /b 1
)

echo [INFO] Starting all services...
docker compose up -d --build

if not errorlevel 1 (
    echo.
    echo ==========================================
    echo   Deploy Success!
    echo ==========================================
    echo.
    echo   Frontend:    http://localhost
    echo   Backend API: http://localhost/api
    echo   MinIO:       http://localhost:9001
    echo.
) else (
    echo [ERROR] Deploy failed
)

pause
