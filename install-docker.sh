#!/bin/bash
#
# Freight Portal Docker 一键安装脚本
# 适合快速测试或不想安装系统依赖的场景
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_docker() {
    log_info "检查 Docker..."
    if ! command -v docker >/dev/null 2>&1; then
        log_info "正在安装 Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_info "正在安装 Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    log_success "Docker 就绪"
}

setup_project() {
    log_info "设置项目..."
    
    INSTALL_DIR="${1:-/opt/freight-portal}"
    
    # 克隆代码
    if [ -d "$INSTALL_DIR" ]; then
        log_warn "目录已存在，更新代码..."
        cd "$INSTALL_DIR" && git pull
    else
        git clone https://github.com/geelatobot/freight-portal.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    # 创建环境文件
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# 数据库
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
MYSQL_DATABASE=freight_portal
MYSQL_USER=freight
MYSQL_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 16)

# JWT
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# 4portun (请替换为真实值)
FOURPORTUN_APPID=your-4portun-appid
FOURPORTUN_SECRET=your-4portun-secret

# Kimi AI (请替换为真实值)
KIMI_API_KEY=your-kimi-api-key
EOF
    fi
    
    log_success "项目设置完成"
}

start_services() {
    log_info "启动服务..."
    
    cd "$INSTALL_DIR"
    
    # 使用 docker-compose 启动
    docker-compose up -d
    
    log_success "服务已启动"
    
    echo ""
    echo "========================================"
    log_success "Freight Portal Docker 部署完成！"
    echo "========================================"
    echo ""
    echo "访问地址:"
    echo "  - 前端: http://$(hostname -I | awk '{print $1}')"
    echo "  - 管理后台: http://$(hostname -I | awk '{print $1}')/admin"
    echo ""
    echo "查看日志: docker-compose logs -f"
    echo "停止服务: docker-compose down"
    echo ""
}

main() {
    echo "========================================"
    echo "  Freight Portal Docker 安装脚本"
    echo "========================================"
    echo ""
    
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行"
        exit 1
    fi
    
    INSTALL_DIR="${1:-/opt/freight-portal}"
    
    check_docker
    setup_project "$INSTALL_DIR"
    start_services
}

main "$@"
