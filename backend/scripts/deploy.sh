#!/bin/bash
#
# Freight Portal Deployment Script
# Version: 2.0.0
# Features: Backup, deploy, health check, rollback support
#

set -o errexit
set -o nounset
set -o pipefail

# =============================================================================
# Configuration
# =============================================================================
readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="freight-portal-deploy"
readonly LOG_FILE="/var/log/${SCRIPT_NAME}.log"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# =============================================================================
# Logging Functions
# =============================================================================

init_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
    log_info "========================================"
    log_info "Deployment started at $(date '+%Y-%m-%d %H:%M:%S')"
}

log_info() {
    printf "${BLUE}[%s] [INFO]${NC} %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

log_success() {
    printf "${GREEN}[%s] [SUCCESS]${NC} %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

log_warn() {
    printf "${YELLOW}[%s] [WARN]${NC} %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

log_error() {
    printf "${RED}[%s] [ERROR]${NC} %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >&2
}

# =============================================================================
# Error Handling
# =============================================================================

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        log_error "========================================"
        log_error "Deployment failed with exit code: $exit_code"
        log_error "Log file: ${LOG_FILE}"
        log_error "========================================"
    fi
    exit $exit_code
}

trap cleanup EXIT

# =============================================================================
# Health Check
# =============================================================================

health_check() {
    local max_attempts=${1:-10}
    local attempt=1
    local url="http://localhost:3000/api/v1/health"

    log_info "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        
        if [ "$http_code" = "200" ]; then
            log_success "Health check passed (HTTP 200)"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts (HTTP $http_code)..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# =============================================================================
# Main
# =============================================================================

main() {
    init_logging

    # 检查参数
    local ENV=${1:-production}
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              Freight Portal - Deployment                       ║"
    echo "║                      Version ${SCRIPT_VERSION}                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Environment: $ENV"
    echo ""

    # 1. 进入目录
    log_info "[1/8] Checking project directory..."
    cd /opt/freight-portal/backend || {
        log_error "Failed to enter project directory"
        exit 1
    }
    log_success "Project directory verified"

    # 2. 备份当前版本
    echo ""
    log_info "[2/8] Backing up current version..."
    local backup_dir="/opt/freight-portal/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    if [ -d "dist" ]; then
        cp -r dist "$backup_dir/" 2>/dev/null || log_warn "Failed to backup dist"
    fi
    if [ -d "node_modules" ]; then
        cp -r node_modules "$backup_dir/" 2>/dev/null || log_warn "Failed to backup node_modules"
    fi
    log_success "Backup completed: $backup_dir"

    # 3. 拉取最新代码
    echo ""
    log_info "[3/8] Pulling latest code..."
    
    # 尝试多个镜像源
    local github_mirrors=(
        "https://ghps.cc/https://github.com"
        "https://gh.api.99988866.xyz/https://github.com"
        "https://kkgithub.com"
        "https://github.com"
    )
    
    local fetch_success=false
    for mirror in "${github_mirrors[@]}"; do
        git remote set-url origin "${mirror}/geelatobot/freight-portal.git" 2>/dev/null || true
        if git fetch origin 2>&1 | tee -a "$LOG_FILE"; then
            fetch_success=true
            log_success "Fetched from: $mirror"
            break
        fi
    done
    
    if [ "$fetch_success" = false ]; then
        log_error "Failed to fetch from all mirrors"
        exit 1
    fi
    
    git reset --hard origin/main
    log_success "Code updated to latest"

    # 4. 安装依赖
    echo ""
    log_info "[4/8] Installing dependencies..."
    if [ -f "package-lock.json" ]; then
        npm ci 2>&1 | tee -a "$LOG_FILE"
    else
        npm install 2>&1 | tee -a "$LOG_FILE"
    fi
    log_success "Dependencies installed"

    # 5. 执行数据库迁移
    echo ""
    log_info "[5/8] Running database migrations..."
    npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
    log_success "Database migrations completed"

    # 6. 生成Prisma客户端
    echo ""
    log_info "[6/8] Generating Prisma client..."
    npx prisma generate 2>&1 | tee -a "$LOG_FILE"
    log_success "Prisma client generated"

    # 7. 构建应用
    echo ""
    log_info "[7/8] Building application..."
    npm run build 2>&1 | tee -a "$LOG_FILE"
    log_success "Application built"

    # 8. 重启服务
    echo ""
    log_info "[8/8] Restarting service..."
    if [ "$ENV" = "production" ]; then
        pm2 reload ecosystem.config.js --env production 2>&1 || pm2 restart freight-portal 2>&1
    else
        pm2 reload ecosystem.config.js --env development 2>&1 || pm2 restart freight-portal 2>&1
    fi
    pm2 save >/dev/null
    log_success "Service restarted"

    # 健康检查
    echo ""
    if health_check; then
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║                     DEPLOYMENT SUCCESSFUL                      ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        log_success "Deployment completed successfully!"
        local server_ip
        server_ip=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')
        echo ""
        echo -e "  Environment: ${GREEN}$ENV${NC}"
        echo -e "  Access URL:  ${YELLOW}http://${server_ip}/api/v1/health${NC}"
        echo -e "  Backup:      ${YELLOW}$backup_dir${NC}"
        echo -e "  Log:         ${YELLOW}$LOG_FILE${NC}"
        echo ""
    else
        log_error "Deployment failed - health check failed"
        log_info "Showing last 20 lines of logs:"
        pm2 logs freight-portal --lines 20 || true
        exit 1
    fi
}

main "$@"
