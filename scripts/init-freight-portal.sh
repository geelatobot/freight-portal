#!/bin/bash

# =============================================================================
# 货代客户门户 - 完整初始化脚本（配置文件版）
# 支持从配置文件读取敏感信息，无需交互输入
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 基础配置
PROJECT_DIR="/opt/freight-portal"
CONFIG_DIR="$PROJECT_DIR/shared"
RELEASES_DIR="$PROJECT_DIR/releases"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
CONFIG_FILE="$CONFIG_DIR/.env"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}货代客户门户 - 完整初始化脚本${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# =============================================================================
# 检查配置文件
# =============================================================================
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}✗ 错误: 未找到配置文件${NC}"
    echo ""
    echo "请先在服务器上创建配置文件:"
    echo "  $CONFIG_FILE"
    echo ""
    echo "配置文件示例:"
    cat << 'EXAMPLE'

# 数据库配置（必填）
DATABASE_URL="mysql://用户名:密码@数据库地址:3306/数据库名"

# JWT配置（自动生成，可选）
JWT_SECRET="your-random-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# 其他配置...
FOURPORTUN_API_URL="https://prod-api.4portun.com"
FOURPORTUN_APPID=""
FOURPORTUN_SECRET=""
KIMI_API_KEY=""

EXAMPLE
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ 找到配置文件: $CONFIG_FILE${NC}"

# =============================================================================
# 读取配置文件
# =============================================================================
source "$CONFIG_FILE"

# 检查必要配置
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ 错误: DATABASE_URL 未配置${NC}"
    exit 1
fi

# 如果没有JWT_SECRET，自动生成
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-random-secret" ]; then
    JWT_SECRET="fp-$(date +%s)-$(openssl rand -hex 16)"
    # 更新配置文件
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" "$CONFIG_FILE"
    echo -e "${GREEN}✓ 自动生成JWT_SECRET并更新配置文件${NC}"
fi

echo -e "${GREEN}✓ 配置加载完成${NC}"

# =============================================================================
# 步骤1: 创建目录结构
# =============================================================================
echo ""
echo -e "${YELLOW}[1/9] 创建目录结构...${NC}"
mkdir -p $CONFIG_DIR
mkdir -p $RELEASES_DIR
mkdir -p $SCRIPTS_DIR
mkdir -p $PROJECT_DIR/agent
mkdir -p $PROJECT_DIR/nginx/ssl
chmod 755 $PROJECT_DIR
echo -e "${GREEN}✓ 目录创建完成${NC}"

# =============================================================================
# 步骤2: 安装系统依赖
# =============================================================================
echo ""
echo -e "${YELLOW}[2/9] 安装系统依赖...${NC}"
apt-get update -qq
apt-get install -y -qq curl git nginx openssl

# 安装Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs

# 安装PM2
npm install -g pm2 --silent

echo -e "${GREEN}✓ 系统依赖安装完成${NC}"

# =============================================================================
# 步骤3: 下载代码
# =============================================================================
echo ""
echo -e "${YELLOW}[3/9] 下载代码仓库...${NC}"

if [ -d "$PROJECT_DIR/source" ]; then
    echo -e "${YELLOW}代码已存在，执行更新...${NC}"
    cd $PROJECT_DIR/source
    git pull origin main
else
    git clone --depth 1 https://github.com/geelatobot/freight-portal.git $PROJECT_DIR/source
fi

echo -e "${GREEN}✓ 代码克隆完成${NC}"

# =============================================================================
# 步骤4: 安装项目依赖
# =============================================================================
echo ""
echo -e "${YELLOW}[4/9] 安装项目依赖...${NC}"
cd $PROJECT_DIR/source/backend
npm install --production --silent
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# =============================================================================
# 步骤5: 复制配置文件
# =============================================================================
echo ""
echo -e "${YELLOW}[5/9] 复制配置文件...${NC}"
cp "$CONFIG_FILE" .
echo -e "${GREEN}✓ 配置文件复制完成${NC}"

# =============================================================================
# 步骤6: 数据库迁移
# =============================================================================
echo ""
echo -e "${YELLOW}[6/9] 执行数据库迁移...${NC}"
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}✓ 数据库迁移完成${NC}"

# =============================================================================
# 步骤7: 构建应用
# =============================================================================
echo ""
echo -e "${YELLOW}[7/9] 构建应用...${NC}"
npm run build
echo -e "${GREEN}✓ 应用构建完成${NC}"

# =============================================================================
# 步骤8: 配置Nginx
# =============================================================================
echo ""
echo -e "${YELLOW}[8/9] 配置Nginx...${NC}"

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

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/freight-portal /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

echo -e "${GREEN}✓ Nginx配置完成${NC}"

# =============================================================================
# 步骤9: 启动服务
# =============================================================================
echo ""
echo -e "${YELLOW}[9/9] 启动服务...${NC}"

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
echo -e "  ${YELLOW}$CONFIG_FILE${NC}"
echo ""
echo -e "常用命令:"
echo -e "  ${YELLOW}pm2 logs freight-portal${NC}     # 查看日志"
echo -e "  ${YELLOW}pm2 restart freight-portal${NC}  # 重启服务"
echo -e "  ${YELLOW}pm2 stop freight-portal${NC}     # 停止服务"
echo -e "  ${YELLOW}pm2 status${NC}                  # 查看状态"
echo ""
