#!/bin/bash

echo "======================================"
echo "货代客户门户 - 部署脚本"
echo "======================================"

# 检查参数
ENV=${1:-production}

echo "部署环境: $ENV"
echo ""

# 1. 进入目录
cd /opt/freight-portal/backend || exit 1

# 2. 备份当前版本
echo "[1/8] 备份当前版本..."
BACKUP_DIR="/opt/freight-portal/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r dist "$BACKUP_DIR/" 2>/dev/null || true
cp -r node_modules "$BACKUP_DIR/" 2>/dev/null || true
echo "备份完成: $BACKUP_DIR"

# 3. 拉取最新代码
echo "[2/8] 拉取最新代码..."
git fetch origin
git reset --hard origin/main

# 4. 安装依赖
echo "[3/8] 安装依赖..."
npm ci

# 5. 执行数据库迁移
echo "[4/8] 执行数据库迁移..."
npx prisma migrate deploy

# 6. 生成Prisma客户端
echo "[5/8] 生成Prisma客户端..."
npx prisma generate

# 7. 构建应用
echo "[6/8] 构建应用..."
npm run build

# 8. 重启服务
echo "[7/8] 重启服务..."
if [ "$ENV" = "production" ]; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 reload ecosystem.config.js --env development
fi

# 9. 健康检查
echo "[8/8] 健康检查..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 部署成功！服务运行正常"
else
  echo "❌ 部署失败！健康检查返回: $HTTP_CODE"
  exit 1
fi

echo ""
echo "======================================"
echo "部署完成"
echo "======================================"
