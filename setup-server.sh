#!/bin/bash
# 服务器一次性初始化脚本 —— 配置国内镜像加速
# 用法: bash setup-server.sh
set -e

echo "========================================"
echo "服务器初始化 - 配置国内镜像加速"
echo "========================================"

# ---------- 1. Git 使用 GitHub 加速 ----------
echo ""
echo "[1/3] 配置 Git GitHub 加速..."

# 先恢复原始 remote（如果之前改过镜像）
if [ -d "/opt/steel-agent/.git" ]; then
    cd /opt/steel-agent
    git remote set-url origin https://github.com/hujihui08-create/steel-industry-agent.git 2>/dev/null
    echo "  ✓ Git remote 已恢复为原始 GitHub 地址"
fi

# 移除旧的代理配置
git config --global --unset url."https://ghproxy.com/https://github.com/".insteadOf 2>/dev/null || true
git config --global --unset url."https://hub.nuaa.cf/".insteadOf 2>/dev/null || true

# 使用 gitclone.com 镜像（已验证能通且速度快）
git config --global url."https://gitclone.com/github.com/".insteadOf "https://github.com/"
echo "  ✓ Git 已配置 gitclone.com 镜像加速"

# ---------- 2. Docker Registry 镜像 ----------
echo ""
echo "[2/3] 配置 Docker 国内镜像..."

DAEMON_CONFIG="/etc/docker/daemon.json"
TMP_CONFIG=$(mktemp)

# 合并现有配置
if [ -f "$DAEMON_CONFIG" ]; then
    cat "$DAEMON_CONFIG" > "$TMP_CONFIG"
fi

# 使用 Python3 或 jq 合并 (优先 jq)
if command -v jq &>/dev/null; then
    cat "$TMP_CONFIG" | jq '. + {"registry-mirrors": [
        "https://docker.1ms.run",
        "https://docker.xuanyuan.me",
        "https://hub.rat.dev"
    ]}' > "${TMP_CONFIG}.new" 2>/dev/null && mv "${TMP_CONFIG}.new" "$TMP_CONFIG"
else
    # 简单覆盖
    echo '{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://hub.rat.dev"
  ]
}' > "$TMP_CONFIG"
fi

if [ -s "$TMP_CONFIG" ]; then
    sudo cp "$TMP_CONFIG" "$DAEMON_CONFIG"
    echo "  ✓ /etc/docker/daemon.json 已更新"
else
    echo "  ⚠ 配置生成失败，请手动配置"
fi
rm -f "$TMP_CONFIG" "${TMP_CONFIG}.new" 2>/dev/null

# 重启 Docker
sudo systemctl daemon-reload 2>/dev/null || true
sudo systemctl restart docker 2>/dev/null || true
echo "  ✓ Docker 已重启"

# ---------- 3. npm 本地也配镜像（备选） ----------
echo ""
echo "[3/3] 配置 npm 全局镜像..."
npm config set registry https://registry.npmmirror.com 2>/dev/null || true
echo "  ✓ npm 镜像已配置"

echo ""
echo "========================================"
echo "✓ 初始化完成！"
echo "========================================"
echo ""
echo "后续部署命令不变，但速度会大幅提升："
echo "  cd /opt/steel-agent && git pull origin master"
echo "  docker compose -f docker-compose.prod.yml build frontend"
echo "  docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend"
echo ""
echo "注意：如果 GitHub 镜像失效，恢复原始 remote："
echo "  git remote set-url origin https://github.com/你的仓库名.git"
