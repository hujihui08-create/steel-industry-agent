# 钢铁行业 Agent 部署指南

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [生产环境部署](#生产环境部署)
- [配置说明](#配置说明)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

## 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 20GB 可用磁盘空间

## 快速开始

### 1. 克隆项目

```bash
cd /path/to/agent
```

### 2. 配置环境变量

复制并编辑后端环境变量：

```bash
cd backend
cp .env.example .env.production
# 编辑 .env.production 文件，填入必要的配置
```

### 3. 启动服务

使用 docker-compose 启动所有服务：

```bash
cd /path/to/agent
docker-compose up -d
```

### 4. 访问应用

- 前端应用：http://localhost
- 后端 API：http://localhost/api
- MinIO 控制台：http://localhost:9001
  - 默认用户名：minioadmin
  - 默认密码：minioadmin

## 生产环境部署

### 1. 生产环境配置

创建生产环境专用的 `.env` 文件：

```bash
cd /path/to/agent
cat > .env.prod << 'EOF'
# 数据库配置
DB_USER=steel_agent
DB_PASSWORD=your_secure_password_here
DB_NAME=steel_agent

# Redis 配置
REDIS_PASSWORD=your_redis_password_here

# MinIO 配置
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
EOF
```

### 2. 配置后端环境变量

编辑 `backend/.env.production`，确保配置了：

- JWT_SECRET（使用强随机字符串）
- OPENAI_API_KEY
- 其他必要的 API 密钥

### 3. 使用生产环境配置启动

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. 配置 HTTPS（推荐）

在 `nginx/ssl/` 目录下放置 SSL 证书：

```
nginx/ssl/
├── cert.pem
└── key.pem
```

更新 `nginx/nginx.conf` 配置以支持 HTTPS。

## 配置说明

### 后端环境变量 (backend/.env.production)

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| DB_HOST | 数据库主机 | 是 | postgres |
| DB_PORT | 数据库端口 | 是 | 5432 |
| DB_USER | 数据库用户 | 是 | postgres |
| DB_PASSWORD | 数据库密码 | 是 | postgres |
| DB_NAME | 数据库名称 | 是 | steel_agent |
| REDIS_HOST | Redis 主机 | 是 | redis |
| REDIS_PORT | Redis 端口 | 是 | 6379 |
| REDIS_PASSWORD | Redis 密码 | 否 | (空) |
| JWT_SECRET | JWT 签名密钥 | 是 | (需修改) |
| MINIO_ENDPOINT | MinIO 地址 | 是 | minio:9000 |
| MINIO_ACCESS_KEY | MinIO 访问密钥 | 是 | minioadmin |
| MINIO_SECRET_KEY | MinIO 密钥 | 是 | minioadmin |
| OPENAI_API_KEY | OpenAI API 密钥 | 是 | (需配置) |
| EMBEDDING_API_KEY | Embedding API 密钥 | 否 | (复用 OpenAI) |
| EMBEDDING_BASE_URL | Embedding API 地址 | 否 | (OpenAI 官方) |
| CRAWLER_ENABLED | 是否启用爬虫 | 否 | true |
| CRAWLER_SCHEDULE | 爬虫定时任务 | 否 | */30 * * * * |

### 端口映射

| 服务 | 容器端口 | 主机端口 | 说明 |
|------|----------|----------|------|
| Nginx | 80, 443 | 80, 443 | 反向代理 |
| Frontend | 80 | 3000 | 前端应用（仅本地访问） |
| Backend | 8080 | 8080 | 后端 API（仅本地访问） |
| PostgreSQL | 5432 | 5432 | 数据库（仅本地访问） |
| Redis | 6379 | 6379 | 缓存（仅本地访问） |
| MinIO | 9000, 9001 | 9000, 9001 | 对象存储（仅本地访问） |

## 常用命令

### 基本操作

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 重新构建并启动
docker-compose up -d --build

# 清理所有数据（危险操作）
docker-compose down -v
```

### 数据库操作

```bash
# 进入 PostgreSQL 容器
docker-compose exec postgres psql -U postgres -d steel_agent

# 备份数据库
docker-compose exec postgres pg_dump -U postgres steel_agent > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres steel_agent < backup.sql
```

### 后端操作

```bash
# 执行数据库迁移
docker-compose exec backend go run cmd/migrate/main.go up

# 填充种子数据
docker-compose exec backend go run cmd/seed/main.go

# 手动触发爬虫
docker-compose exec backend go run cmd/crawler/main.go
```

## 故障排查

### 服务无法启动

1. 检查端口占用：`netstat -tlnp | grep -E '80|5432|6379|8080|9000'`
2. 检查日志：`docker-compose logs <service_name>`
3. 检查磁盘空间：`df -h`
4. 检查内存使用：`free -m`

### 数据库连接失败

1. 确认 PostgreSQL 容器正在运行：`docker-compose ps postgres`
2. 检查数据库日志：`docker-compose logs postgres`
3. 确认环境变量中的数据库配置正确

### API 响应缓慢

1. 检查 Redis 连接状态
2. 检查 API 调用日志中的响应时间
3. 检查 OpenAI API 的延迟和可用性
4. 考虑增加缓存策略

### MinIO 连接问题

1. 确认 MinIO 容器正在运行
2. 检查 MinIO 控制台是否可访问：http://localhost:9001
3. 验证访问密钥配置是否正确
