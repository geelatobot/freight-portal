#!/bin/bash
#
# Freight Portal 一键安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/geelatobot/freight-portal/main/install.sh | bash
# 或者: wget -qO- https://raw.githubusercontent.com/geelatobot/freight-portal/main/install.sh | bash
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "此脚本仅支持 Linux 系统"
        exit 1
    fi
    
    # 检查内存
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_MEM" -lt 2048 ]; then
        log_warn "建议内存至少 2GB，当前 ${TOTAL_MEM}MB"
    fi
    
    # 检查磁盘空间
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 10485760 ]; then  # 10GB in KB
        log_warn "建议磁盘空间至少 10GB"
    fi
    
    log_success "系统检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    if command_exists apt-get; then
        # Debian/Ubuntu
        apt-get update -qq
        apt-get install -y -qq curl wget git mysql-server redis-server nginx
    elif command_exists yum; then
        # CentOS/RHEL
        yum install -y -q curl wget git mysql-server redis nginx
    elif command_exists dnf; then
        # Fedora
        dnf install -y -q curl wget git mysql-server redis nginx
    else
        log_error "不支持的包管理器"
        exit 1
    fi
    
    log_success "系统依赖安装完成"
}

# 安装 Node.js
install_nodejs() {
    log_info "安装 Node.js..."
    
    if command_exists node && [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" = "22" ]; then
        log_info "Node.js 22 已安装，跳过"
        return
    fi
    
    # 使用 NodeSource 安装 Node.js 22
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    
    if command_exists apt-get; then
        apt-get install -y -qq nodejs
    elif command_exists yum; then
        yum install -y -q nodejs
    elif command_exists dnf; then
        dnf install -y -q nodejs
    fi
    
    # 安装 pnpm
    npm install -g pnpm pm2
    
    log_success "Node.js $(node -v) 安装完成"
}

# 安装 PM2
install_pm2() {
    log_info "安装 PM2..."
    
    if command_exists pm2; then
        log_info "PM2 已安装，跳过"
        return
    fi
    
    npm install -g pm2
    pm2 startup systemd
    
    log_success "PM2 安装完成"
}

# 配置 MySQL
setup_mysql() {
    log_info "配置 MySQL..."
    
    # 启动 MySQL
    systemctl start mysql || systemctl start mysqld
    systemctl enable mysql || systemctl enable mysqld
    
    # 创建数据库
    mysql -e "CREATE DATABASE IF NOT EXISTS freight_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
    mysql -e "CREATE DATABASE IF NOT EXISTS freight_portal_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
    
    # 创建用户（如果不存在）
    mysql -e "CREATE USER IF NOT EXISTS 'freight'@'localhost' IDENTIFIED BY 'freight_password_123';" 2>/dev/null || true
    mysql -e "GRANT ALL PRIVILEGES ON freight_portal.* TO 'freight'@'localhost';" 2>/dev/null || true
    mysql -e "GRANT ALL PRIVILEGES ON freight_portal_test.* TO 'freight'@'localhost';" 2>/dev/null || true
    mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    
    log_success "MySQL 配置完成"
    log_info "数据库: freight_portal"
    log_info "用户名: freight"
    log_info "密码: freight_password_123"
}

# 配置 Redis
setup_redis() {
    log_info "配置 Redis..."
    
    systemctl start redis
    systemctl enable redis
    
    log_success "Redis 配置完成"
}

# 克隆代码
clone_repo() {
    log_info "克隆代码仓库..."
    
    INSTALL_DIR="${INSTALL_DIR:-/opt/freight-portal}"
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warn "目录 $INSTALL_DIR 已存在，将更新代码"
        cd "$INSTALL_DIR"
        git pull origin main
    else
        git clone https://github.com/geelatobot/freight-portal.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    log_success "代码克隆完成: $INSTALL_DIR"
}

# 配置环境变量
setup_env() {
    log_info "配置环境变量..."
    
    cd "$INSTALL_DIR/backend"
    
    if [ ! -f ".env" ]; then
        cat > .env << 'EOF'
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置
DATABASE_URL="mysql://freight:freight_password_123@localhost:3306/freight_portal"

# JWT 配置
JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
JWT_EXPIRES_IN=7d

# Redis 配置
REDIS_URL=redis://localhost:6379

# 4portun API 配置 (请替换为真实值)
FOURPORTUN_BASE_URL=https://prod-api.4portun.com
FOURPORTUN_APPID=your-4portun-appid
FOURPORTUN_SECRET=your-4portun-secret
FOURPORTUN_WEBHOOK_SECRET=your-webhook-secret

# AI 配置 (请替换为真实值)
KIMI_API_KEY=your-kimi-api-key
KIMI_BASE_URL=https://api.moonshot.cn/v1

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=uploads

# 日志配置
LOG_LEVEL=info
LOG_MAX_FILES=30d
EOF
        log_warn "已生成 .env 文件，请编辑并替换占位符值"
    fi
    
    log_success "环境变量配置完成"
}

# 安装后端依赖
install_backend() {
    log_info "安装后端依赖..."
    
    cd "$INSTALL_DIR/backend"
    
    # 安装依赖
    pnpm install
    
    # 生成 Prisma 客户端
    npx prisma generate
    
    # 执行数据库迁移
    npx prisma migrate deploy
    
    # 构建
    pnpm run build
    
    log_success "后端安装完成"
}

# 安装前端
install_frontend() {
    log_info "安装前端依赖..."
    
    # Web 端
    cd "$INSTALL_DIR/frontend/web"
    npm install
    npm run build
    
    # 管理后台
    cd "$INSTALL_DIR/frontend/admin"
    npm install
    npm run build
    
    log_success "前端安装完成"
}

# 配置 Nginx
setup_nginx() {
    log_info "配置 Nginx..."
    
    cat > /etc/nginx/sites-available/freight-portal << EOF
server {
    listen 80;
    server_name _;
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Web 端
    location / {
        root $INSTALL_DIR/frontend/web/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # 管理后台
    location /admin {
        alias $INSTALL_DIR/frontend/admin/dist;
        try_files \$uri \$uri/ /admin/index.html;
    }
    
    # 上传文件
    location /uploads {
        alias $INSTALL_DIR/backend/uploads;
    }
}
EOF
    
    # 启用配置
    ln -sf /etc/nginx/sites-available/freight-portal /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    nginx -t
    
    # 重启 Nginx
    systemctl restart nginx
    
    log_success "Nginx 配置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    cd "$INSTALL_DIR/backend"
    
    # 使用 PM2 启动
    pm2 start dist/main.js --name "freight-api" -- --port=3001
    pm2 save
    
    log_success "服务已启动"
}

# 显示完成信息
show_completion() {
    echo ""
    echo "========================================"
    log_success "Freight Portal 安装完成！"
    echo "========================================"
    echo ""
    echo "访问地址:"
    echo "  - 前端: http://$(hostname -I | awk '{print $1}')"
    echo "  - 管理后台: http://$(hostname -I | awk '{print $1}')/admin"
    echo "  - API: http://$(hostname -I | awk '{print $1}')/api"
    echo ""
    echo "安装目录: $INSTALL_DIR"
    echo ""
    echo "常用命令:"
    echo "  pm2 status          # 查看服务状态"
    echo "  pm2 logs freight-api # 查看后端日志"
    echo "  pm2 restart freight-api # 重启后端服务"
    echo ""
    echo "重要提示:"
    echo "  1. 请编辑 $INSTALL_DIR/backend/.env 文件，替换 API 密钥等配置"
    echo "  2. 如需 HTTPS，请配置 SSL 证书"
    echo "  3. 建议配置防火墙规则，只开放 80/443 端口"
    echo ""
}

# 主函数
main() {
    echo "========================================"
    echo "  Freight Portal 一键安装脚本"
    echo "========================================"
    echo ""
    
    # 检查 root 权限
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行此脚本"
        echo "用法: sudo bash install.sh"
        exit 1
    fi
    
    # 设置安装目录
    INSTALL_DIR="${1:-/opt/freight-portal}"
    
    # 执行安装步骤
    check_requirements
    install_dependencies
    install_nodejs
    install_pm2
    setup_mysql
    setup_redis
    clone_repo
    setup_env
    install_backend
    install_frontend
    setup_nginx
    start_services
    show_completion
}

# 运行主函数
main "$@"
