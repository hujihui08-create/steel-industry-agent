@echo off
REM 钢铁行业 Agent 构建脚本 (Windows)
REM 用于构建和部署应用

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ==========================================
echo   钢铁行业 Agent 构建脚本
echo ==========================================
echo.

REM 检查 Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker 未安装或未运行，请先安装并启动 Docker
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Docker Compose 未安装，请先安装 Docker Compose
        pause
        exit /b 1
    )
)

echo [INFO] Docker 环境检查通过
echo.

REM 检查环境变量
if not exist "backend\.env.production" (
    echo [WARN] 未找到 backend\.env.production
    if exist "backend\.env" (
        echo [INFO] 从 backend\.env 复制配置
        copy "backend\.env" "backend\.env.production" >nul
    )
)

REM 清理旧构建产物，确保与源码一致
echo [INFO] 清理旧的构建产物...
if exist "steel-agent-web\dist" (
    rmdir /s /q "steel-agent-web\dist"
)

echo [INFO] 开始构建前端...
cd steel-agent-web

if not exist "node_modules" (
    echo [INFO] 安装前端依赖...
    call npm install --legacy-peer-deps
    if !errorlevel! neq 0 (
        echo [ERROR] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [INFO] 构建前端应用...
call npm run build
if !errorlevel! neq 0 (
    echo [ERROR] 前端构建失败
    pause
    exit /b 1
)

cd ..
echo [INFO] 前端构建完成
echo.

REM 停止旧服务
echo [INFO] 停止旧服务...
docker-compose down >nul 2>&1

REM 强制重建前端镜像（不使用 Docker 缓存）
echo [INFO] 构建前端 Docker 镜像（无视缓存）...
docker-compose build --no-cache frontend
if !errorlevel! neq 0 (
    echo [ERROR] 前端镜像构建失败
    pause
    exit /b 1
)

REM 构建并启动所有服务
echo [INFO] 构建后端并启动所有服务...
docker-compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo   钢铁行业 Agent 部署完成！
    echo ==========================================
    echo.
    echo   访问地址：
    echo   - 前端应用: http://localhost
    echo   - 后端 API: http://localhost/api
    echo   - MinIO 控制台: http://localhost:9001
    echo.
    echo   默认凭据：
    echo   - MinIO 用户名: minioadmin
    echo   - MinIO 密码: minioadmin
    echo.
    echo   管理命令：
    echo   - 查看日志: docker-compose logs -f
    echo   - 停止服务: docker-compose down
    echo   - 重启服务: docker-compose restart
    echo.
    echo   详细文档请查看: DEPLOYMENT.md
    echo.
) else (
    echo [ERROR] 部署失败，请检查错误信息
)

pause
