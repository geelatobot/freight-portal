#!/bin/bash

# =============================================================================
# 货代客户门户 - 完整初始化脚本
# 只需复制粘贴一次，自动完成所有配置
# 
# ⚠️ 安全提醒：
# - 此脚本需要你在服务器上手动输入敏感信息
# - 不要在任何公开场合分享此脚本的执行结果
# - 所有敏感信息将保存在服务器本地，不上传GitHub
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 基础配置（非敏感）
PROJECT_DIR="/opt/freight-portal"
CONFIG_DIR="$PROJECT_DIR/shared"
RELEASES_DIR="$PROJECT_DIR/releases"
SCRIPTS_DIR="$PROJECT_DIR/scripts"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}货代客户门户 - 完整初始化脚本${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# =============================================================================
# 步骤1: 创建目录结构
# =============================================================================
echo -e "${YELLOW}[1/10] 创建目录结构...${NC}"
mkdir -p $CONFIG_DIR
mkdir -p $RELEASES_DIR
mkdir -p $SCRIPTS_DIR
mkdir -p $PROJECT_DIR/agent
mkdir -p $PROJECT_DIR/nginx/ssl
chmod 755 $PROJECT_DIR
echo -e "${GREEN}✓ 目录创建完成${NC}"

# =============================================================================
# 步骤2: 生成JWT密钥
# =============================================================================
echo ""
echo -e "${YELLOW}[2/10] 生成JWT密钥...${NC}"
JWT_SECRET="fp-$(date +%s)-$(openssl rand -hex 16)"
echo -e "${GREEN}✓ JWT密钥生成完成${NC}"

# =============================================================================
# 步骤3: 输入敏感信息（交互式，不在脚本中硬编码）
# =============================================================================
echo ""
echo -e "${YELLOW}[3/10] 配置数据库连接...${NC}"
echo -e "${RED}⚠️  请输入你的数据库配置（输入时不会显示）${NC}"
echo ""

read -p "数据库主机地址 (如: rm-xxx.mysql.rds.aliyuncs.com): " DB_HOST
read -p "数据库端口 [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}
read -p "数据库名称: " DB_NAME
read -p "数据库用户名: " DB_USER
echo -n "数据库密码: "
read -s DB_PASS
echo ""

if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
    echo -e "${RED}✗ 数据库配置不能为空${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 数据库配置已输入${NC}"

# =============================================================================
# 步骤4: 创建环境变量文件
# =============================================================================
echo ""
echo -e "${YELLOW}[4/10] 创建环境变量文件...${NC}"

cat > $CONFIG_DIR/.env << EOF
# =============================================================================
# 货代客户门户 - 环境变量配置
# 此文件包含敏感信息，请勿上传到GitHub
# =============================================================================

# -----------------------------------------------------------------------------
# 数据库配置（阿里云RDS）
# -----------------------------------------------------------------------------
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# -----------------------------------------------------------------------------
# Redis配置（可选，默认本地）
# -----------------------------------------------------------------------------
REDIS_URL="redis://localhost:6379"

# -----------------------------------------------------------------------------
# JWT配置
# -----------------------------------------------------------------------------
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# -----------------------------------------------------------------------------
# 服务器配置
# -----------------------------------------------------------------------------
PORT=3000
NODE_ENV="production"
API_PREFIX="/api/v1"

# -----------------------------------------------------------------------------
# 4portun API配置（联系4portun获取后填写）
# 文档: https://prod-api.4portun.com
# 联系人: zjsg_log@4portun.com / 13205918562
# -----------------------------------------------------------------------------
FOURPORTUN_API_URL="https://prod-api.4portun.com"
FOURPORTUN_APPID=""
FOURPORTUN_SECRET=""
FOURPORTUN_WEBHOOK_SECRET=""

# -----------------------------------------------------------------------------
# Kimi AI配置（联系月之暗面获取后填写）
# 官网: https://www.moonshot.cn/
# -----------------------------------------------------------------------------
KIMI_API_URL="https://api.moonshot.cn/v1"
KIMI_API_KEY=""

# -----------------------------------------------------------------------------
# 微信小程序配置（可选）
# -----------------------------------------------------------------------------
WECHAT_APPID=""
WECHAT_SECRET=""

# -----------------------------------------------------------------------------
# 日志配置
# -----------------------------------------------------------------------------
LOG_LEVEL="info"
LOG_PATH="./logs"
EOF

chmod 600 $CONFIG_DIR/.env
echo -e "${GREEN}✓ 环境变量文件创建完成: $CONFIG_DIR/.env${NC}"

# =============================================================================
# 步骤5: 安装系统依赖
# =============================================================================
echo ""
echo -e "${YELLOW}[5/10] 安装系统依赖...${NC}"
apt-get update -qq
apt-get install -y -qq curl git nginx openssl

# 安装Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs

# 安装PM2
npm install -g pm2 --silent

echo -e "${GREEN}✓ 系统依赖安装完成${NC}"

# =============================================================================
# 步骤6: 下载代码
# =============================================================================
echo ""
echo -e "${YELLOW}[6/10] 下载代码仓库...${NC}"

if [ -d "$PROJECT_DIR/source" ]; then
    echo -e "${YELLOW}代码已存在，执行更新...${NC}"
    cd $PROJECT_DIR/source
    git pull origin main
else
    git clone --depth 1 https://github.com/geelatobot/freight-portal.git $PROJECT_DIR/source
fi

echo -e "${GREEN}✓ 代码克隆完成${NC}"

# =============================================================================
# 步骤7: 安装项目依赖
# =============================================================================
echo ""
echo -e "${YELLOW}[7/10] 安装项目依赖...${NC}"
cd $PROJECT_DIR/source/backend
npm install --production --silent
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# =============================================================================
# 步骤8: 数据库迁移
# =============================================================================
echo ""
echo -e "${YELLOW}[8/10] 执行数据库迁移...${NC}"
cp $CONFIG_DIR/.env .
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}✓ 数据库迁移完成${NC}"

# =============================================================================
# 步骤9: 构建应用
# =============================================================================
echo ""
echo -e "${YELLOW}[9/10] 构建应用...${NC}"
npm run build
echo -e "${GREEN}✓ 应用构建完成${NC}"

# =============================================================================
# 步骤10: 配置Nginx
# =============================================================================
echo ""
echo -e "${YELLOW}[10/10] 配置Nginx...${NC}"

cat > /etc/nginx/sites-available/freight-portal << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    
    location /health {
        proxy_pass http://localhost:3000/api/v1/health;
        access_log off;
    }
}
NGINX_CONFIG

ln -sf /etc/nginx/sites-available/freight-portal /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo -e "${GREEN}✓ Nginx配置完成${NC}"

# =============================================================================
# 步骤11: 启动服务
# =============================================================================
echo ""
echo -e "${YELLOW}[11/11] 启动服务...${NC}"

# 创建当前版本链接
ln -sfn $PROJECT_DIR/source/backend $PROJECT_DIR/current

# PM2启动
cd $PROJECT_DIR/current
pm2 delete freight-portal 2>/dev/null || true
pm2 start ecosystem.config.js --name freight-portal --env production
pm2 save

# 健康检查
echo ""
echo -e "${YELLOW}健康检查...${NC}"
sleep 3
if curl -sf http://localhost:3000/api/v1/health >/dev/null; then
    echo -e "${GREEN}✓ 服务运行正常${NC}"
else
    echo -e "${RED}✗ 服务启动失败，请检查日志${NC}"
    pm2 logs freight-portal --lines 20
    exit 1
fi

# =============================================================================
# 完成
# =============================================================================
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ 初始化完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  http://$(curl -s ifconfig.me)/api/v1/health"
echo ""
echo -e "配置文件位置:"
echo -e "  ${YELLOW}$CONFIG_DIR/.env${NC}"
echo ""
echo -e "常用命令:"
echo -e "  ${YELLOW}pm2 logs freight-portal${NC}     # 查看日志"
echo -e "  ${YELLOW}pm2 restart freight-portal${NC}  # 重启服务"
echo -e "  ${YELLOW}pm2 stop freight-portal${NC}     # 停止服务"
echo -e "  ${YELLOW}pm2 status${NC}                  # 查看状态"
echo ""
echo -e "${YELLOW}注意：请编辑 $CONFIG_DIR/.env 文件，填写4portun和Kimi的API密钥${NC}"
echo ""
