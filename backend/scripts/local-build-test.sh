#!/bin/bash
#
# 本地构建测试脚本
#

set -e

echo "======================================"
echo "Freight Portal - 本地构建测试"
echo "======================================"
echo ""

cd /root/.openclaw/workspace/projects/freight-portal/backend

# 检查 package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json 不存在"
    exit 1
fi
echo "✅ package.json 存在"

# 检查 schema.prisma
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ schema.prisma 不存在"
    exit 1
fi
echo "✅ schema.prisma 存在"

# 步骤1: 安装依赖
echo ""
echo "[1/4] 安装 npm 依赖..."
if [ -f "package-lock.json" ]; then
    npm ci --production=false
else
    npm install --production=false
fi
echo "✅ 依赖安装完成"

# 步骤2: 生成 Prisma 客户端
echo ""
echo "[2/4] 生成 Prisma 客户端..."
./node_modules/.bin/prisma generate
echo "✅ Prisma 客户端生成完成"

# 步骤3: 构建应用
echo ""
echo "[3/4] 构建应用..."
NODE_ENV=production ./node_modules/.bin/nest build
echo "✅ 构建完成"

# 步骤4: 检查构建输出
echo ""
echo "[4/4] 检查构建输出..."
if [ -d "dist" ] && [ -f "dist/main.js" ]; then
    echo "✅ dist/main.js 存在"
    ls -lh dist/main.js
else
    echo "❌ 构建输出不完整"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ 本地构建测试通过"
echo "======================================"
