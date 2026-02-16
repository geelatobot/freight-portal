#!/bin/bash

# =============================================================================
# 货代客户门户 - 实时显示进度版本
# 前台执行，实时显示进度和日志
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 基础配置
PROJECT_DIR="/opt/freight-portal"
CONFIG_DIR="$PROJECT_DIR/shared"
CONFIG_FILE="$CONFIG_DIR/.env"

# 打印带时间的日志
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

# 打印步骤
step() {
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW} 步骤 $1/9: $2${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

# 打印成功
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 打印错误
error() {
    echo -e "${RED}✗ $1${NC}"
}

# 显示进度动画
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}货代客户门户 - 初始化脚本${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# =============================================================================
# 步骤0: 检查配置文件
# =============================================================================
step "0" "检查配置文件"

if [ ! -f "$CONFIG_FILE" ]; then
    error "未找到配置文件: $CONFIG_FILE"
    echo ""
    echo "请先创建配置文件:"
    echo "  mkdir -p $CONFIG_DIR"
    echo "  nano $CONFIG_FILE"
    echo ""
    echo "配置文件内容示例:"
    echo 'DATABASE_URL="mysql://用户名:密码@主机:3306/数据库名"'
    echo 'JWT_SECRET=""'
    exit 1
fi

log "加载配置文件..."
source "$CONFIG_FILE"
success "配置文件加载完成"

# 自动生成JWT
if [ -z "$JWT_SECRET" ]; then
    log "生成JWT密钥..."
    JWT_SECRET="fp-$(date +%s)-$(openssl rand -hex 16)"
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" "$CONFIG_FILE"
    success "JWT密钥已生成并保存"
fi

# =============================================================================
# 步骤1: 安装系统依赖
# =============================================================================
step "1" "安装系统依赖"

log "更新软件源..."
(apt-get update -qq) &
spinner $!
success "软件源更新完成"

log "安装必要软件..."
apt-get install -y curl git nginx openssl -qq > /dev/null 2>&1
success "系统依赖安装完成"

# =============================================================================
# 步骤2: 安装Node.js
# =============================================================================
step "2" "安装Node.js"

log "下载Node.js安装脚本..."
(curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1) &
spinner $!
success "Node.js安装脚本下载完成"

log "安装Node.js和npm..."
apt-get install -y nodejs -qq > /dev/null 2>&1
success "Node.js安装完成: $(node -v)"

log "安装PM2..."
npm install -g pm2 --silent > /dev/null 2>&1
success "PM2安装完成"

# =============================================================================
# 步骤3: 下载代码
# =============================================================================
step "3" "下载代码"

if [ -d "$PROJECT_DIR/source" ]; then
    log "代码已存在，更新代码..."
    cd $PROJECT_DIR/source
    git pull origin main
else
    log "克隆代码仓库..."
    mkdir -p $PROJECT_DIR
    git clone --depth 1 https://github.com/geelatobot/freight-portal.git $PROJECT_DIR/source
fi
success "代码下载完成"

# =============================================================================
# 步骤4: 安装项目依赖
# =============================================================================
step "4" "安装项目依赖"

cd $PROJECT_DIR/source/backend

log "安装npm依赖（约需3-5分钟）..."
echo "    正在下载依赖包，请稍候..."
npm install --production --silent > /dev/null 2>&1 &
PID=$!
while kill -0 $PID 2>/dev/null; do
    echo -n "."
    sleep 2
done
echo ""
success "npm依赖安装完成"

# =============================================================================
# 步骤5: 复制配置文件
# =============================================================================
step "5" "复制配置文件"

cp "$CONFIG_FILE" .
success "配置文件复制完成"

# =============================================================================
# 步骤6: 数据库迁移
# =============================================================================
step "6" "数据库迁移"

log "生成Prisma客户端..."
npx prisma generate > /dev/null 2>&1
success "Prisma客户端生成完成"

log "执行数据库迁移..."
npx prisma migrate deploy
success "数据库迁移完成"

# =============================================================================
# 步骤7: 构建应用
# =============================================================================
step "7" "构建应用"

log "编译TypeScript..."
npm run build > /dev/null 2>&1
success "应用构建完成"

# =============================================================================
# 步骤8: 配置Nginx
# =============================================================================
step "8" "配置Nginx"

cat > /etc/nginx/sites-available/freight-portal << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/freight-portal /etc/nginx/sites-enabled/
nginx -t > /dev/null 2>&1 && systemctl restart nginx
success "Nginx配置完成"

# =============================================================================
# 步骤9: 启动服务
# =============================================================================
step "9" "启动服务"

ln -sfn $PROJECT_DIR/source/backend $PROJECT_DIR/current
cd $PROJECT_DIR/current

log "停止旧服务..."
pm2 delete freight-portal 2>/dev/null || true

log "启动新服务..."
pm2 start ecosystem.config.js --name freight-portal --env production > /dev/null 2>&1
pm2 save > /dev/null 2>&1
success "服务启动完成"

# =============================================================================
# 健康检查
# =============================================================================
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW} 健康检查${NC}"
echo -e "${YELLOW}========================================${NC}"

log "等待服务启动..."
for i in 1 2 3 4 5; do
    if curl -sf http://localhost:3000/api/v1/health >/dev/null 2>&1; then
        success "服务运行正常"
        break
    fi
    echo "  尝试 $i/5..."
    sleep 2
done

# =============================================================================
# 完成
# =============================================================================
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ 初始化完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  ${YELLOW}http://$(curl -s ifconfig.me)/api/v1/health${NC}"
echo ""
echo -e "常用命令:"
echo -e "  ${YELLOW}pm2 logs freight-portal${NC}     # 查看日志"
echo -e "  ${YELLOW}pm2 restart freight-portal${NC}  # 重启服务"
echo -e "  ${YELLOW}pm2 status${NC}                  # 查看状态"
echo ""
