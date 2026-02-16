#!/bin/bash

echo "======================================"
echo "货代客户门户 - 快速启动脚本"
echo "======================================"
echo ""

# 检查是否在backend目录
if [ ! -f "package.json" ]; then
    echo "请在 backend 目录下运行此脚本"
    exit 1
fi

echo "[1/5] 安装依赖..."
npm install --registry=https://registry.npmmirror.com
if [ $? -ne 0 ]; then
    echo "依赖安装失败，尝试使用默认源..."
    npm install
fi

echo ""
echo "[2/5] 生成Prisma客户端..."
npx prisma generate

echo ""
echo "[3/5] 执行数据库迁移..."
npx prisma migrate dev --name init

echo ""
echo "[4/5] 构建项目..."
npm run build

echo ""
echo "[5/5] 启动开发服务器..."
echo "服务将启动在 http://localhost:3000"
echo "按 Ctrl+C 停止服务"
echo ""
npm run start:dev
