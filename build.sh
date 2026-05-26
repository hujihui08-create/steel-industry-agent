#!/bin/bash

# 钢铁行业 Agent 构建脚本
# 用于构建和部署应用

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装并运行
check_docker() {
    # 1. 检查 Docker CLI 是否安装
    if ! command -v docker &> /dev/null; then
        log_error "Docker CLI 未安装，请先安装 Docker"
        exit 1
    fi

    # 2. 检查 Docker 守护进程是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 守护进程未运行，请启动 Docker Desktop"
        log_warn "如果 Docker Desktop 已显示 Running，请尝试:"
        log_warn "  1. 等待 Docker 引擎就绪（Engine 变为绿色 Running）"
        log_warn "  2. 重新打开当前终端（Shell 需重启以加载 Docker 环境）"
        log_warn "  3. 重启 Docker Desktop"
        exit 1
    fi

    # 3. 检查 Docker Compose
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请更新 Docker Desktop 到最新版本"
        exit 1
    fi

    log_info "Docker 环境检查通过（CLI + 守护进程均已就绪）"
}

# 检查环境变量配置
check_env() {
    if [ ! -f "$SCRIPT_DIR/backend/.env.production" ]; then
        log_warn "未找到 backend/.env.production，将使用默认配置"
        if [ -f "$SCRIPT_DIR/backend/.env" ]; then
            cp "$SCRIPT_DIR/backend/.env" "$SCRIPT_DIR/backend/.env.production"
            log_info "已从 backend/.env 复制配置"
        fi
    else
        log_info "环境变量配置已就绪"
    fi
}

# 清理旧的构建
cleanup() {
    log_info "清理旧的构建资源..."
    docker-compose down --remove-orphans 2>/dev/null || true
}

# 构建前端
build_frontend() {
    log_info "开始构建前端..."
    cd "$SCRIPT_DIR/steel-agent-web"
    
    log_info "清理旧的构建产物..."
    rm -rf dist
    
    if [ -d "node_modules" ]; then
        log_info "node_modules 已存在，跳过依赖安装"
    else
        log_info "安装前端依赖..."
        npm install --legacy-peer-deps
    fi
    
    log_info "构建前端应用..."
    npm run build
    
    log_info "前端构建完成"
    cd "$SCRIPT_DIR"
}

# 构建并启动服务
start_services() {
    log_info "开始构建并启动所有服务..."
    
    if [ "$1" = "prod" ]; then
        log_info "强制重建前端镜像（不使用 Docker 缓存）..."
        docker-compose -f docker-compose.prod.yml build --no-cache frontend
        docker-compose -f docker-compose.prod.yml up -d --build
    else
        log_info "强制重建前端镜像（不使用 Docker 缓存）..."
        docker-compose build --no-cache frontend
        docker-compose up -d --build
    fi
    
    log_info "服务启动成功！"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep -q "Up"; then
            log_info "服务已启动"
            return 0
        fi
        attempt=$((attempt + 1))
        log_info "等待... ($attempt/$max_attempts)"
        sleep 3
    done
    
    log_warn "服务启动超时，请检查日志"
    return 1
}

# 显示访问信息
show_access_info() {
    echo ""
    echo "=========================================="
    echo "  钢铁行业 Agent 部署完成！"
    echo "=========================================="
    echo ""
    echo "  访问地址："
    echo "  - 前端应用: http://localhost"
    echo "  - 后端 API: http://localhost/api"
    echo "  - MinIO 控制台: http://localhost:9001"
    echo ""
    echo "  默认凭据："
    echo "  - MinIO 用户名: minioadmin"
    echo "  - MinIO 密码: minioadmin"
    echo ""
    echo "  管理命令："
    echo "  - 查看日志: docker-compose logs -f"
    echo "  - 停止服务: docker-compose down"
    echo "  - 重启服务: docker-compose restart"
    echo ""
    echo "  详细文档请查看: DEPLOYMENT.md"
    echo ""
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [命令]"
    echo ""
    echo "命令："
    echo "  build    - 构建前端并启动所有服务（开发环境）"
    echo "  prod     - 构建并启动生产环境"
    echo "  clean    - 清理构建资源"
    echo "  help     - 显示此帮助信息"
    echo ""
}

# 主函数
main() {
    case "${1:-build}" in
        build)
            log_info "开始构建（开发环境）..."
            check_docker
            check_env
            cleanup
            build_frontend
            start_services "dev"
            wait_for_services
            show_access_info
            ;;
        prod)
            log_info "开始构建（生产环境）..."
            check_docker
            check_env
            cleanup
            build_frontend
            start_services "prod"
            wait_for_services
            show_access_info
            ;;
        clean)
            log_info "清理构建资源..."
            cleanup
            log_info "清理完成"
            ;;
        help)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
