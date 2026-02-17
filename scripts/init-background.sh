#!/bin/bash
#
# Freight Portal Background Initialization Script
# Version: 2.0.0
# Features: Background execution, retry logic, comprehensive logging
#

set -o errexit
set -o nounset
set -o pipefail

# =============================================================================
# Configuration
# =============================================================================
readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="freight-portal-init"
readonly LOG_FILE="/var/log/freight-portal-install.log"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

# =============================================================================
# Logging Functions
# =============================================================================

init_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
}

log_info() {
    printf "[%s] [INFO] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
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
        log_error "=========================================="
        log_error "Initialization failed with exit code: $exit_code"
        log_error "Log file: $LOG_FILE"
        log_error "=========================================="
    fi
    exit $exit_code
}

trap cleanup EXIT

# =============================================================================
# Retry Logic
# =============================================================================

# 带重试的命令执行
retry_command() {
    local max_retries=$1
    local delay=$2
    shift 2
    local count=0

    while [ $count -lt $max_retries ]; do
        if "$@"; then
            return 0
        fi
        count=$((count + 1))
        log_warn "Command failed (attempt $count/$max_retries): $*"
        if [ $count -lt $max_retries ]; then
            log_info "Retrying in ${delay} seconds..."
            sleep "$delay"
        fi
    done

    log_error "Command failed after $max_retries attempts: $*"
    return 1
}

# 带进度显示的后台任务
run_with_spinner() {
    local message="$1"
    shift
    local pid

    log_info "$message"
    "$@" &
    pid=$!

    # 显示进度点
    while kill -0 $pid 2>/dev/null; do
        echo -n "."
        sleep 2
    done
    echo ""

    wait $pid
    return $?
}

# =============================================================================
# Main
# =============================================================================

main() {
    init_logging

    echo "=========================================="
    echo "Freight Portal - Background Initialization"
    echo "Version: $SCRIPT_VERSION"
    echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Log file: $LOG_FILE"
    echo "=========================================="

    # 基础配置
    local PROJECT_DIR="/opt/freight-portal"
    local CONFIG_DIR="$PROJECT_DIR/shared"
    local CONFIG_FILE="$CONFIG_DIR/.env"

    # 检查配置文件
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi

    # shellcheck source=/dev/null
    source "$CONFIG_FILE"

    # 自动生成JWT
    if [ -z "${JWT_SECRET:-}" ]; then
        JWT_SECRET="fp-$(date +%s)-$(openssl rand -hex 16)"
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" "$CONFIG_FILE"
        log_success "Auto-generated JWT_SECRET"
    fi

    echo ""
    log_info "[1/9] Installing system dependencies..."
    if run_with_spinner "Updating package lists" apt-get update -qq; then
        log_success "Package lists updated"
    else
        log_error "Failed to update package lists"
        exit 1
    fi

    if retry_command 3 5 apt-get install -y curl git nginx openssl -qq; then
        log_success "System dependencies installed"
    else
        log_error "Failed to install system dependencies"
        exit 1
    fi

    echo ""
    log_info "[2/9] Installing Node.js..."
    if retry_command 3 5 curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh; then
        bash /tmp/nodesource_setup.sh >/dev/null 2>&1
        apt-get install -y nodejs -qq
        npm install -g pm2 --silent
        log_success "Node.js installed: $(node -v)"
    else
        log_error "Failed to install Node.js"
        exit 1
    fi

    echo ""
    log_info "[3/9] Downloading code..."
    
    # 尝试多个镜像源
    local github_mirrors=(
        "https://ghps.cc/https://github.com"
        "https://gh.api.99988866.xyz/https://github.com"
        "https://kkgithub.com"
        "https://github.com"
    )
    
    local clone_success=false
    if [ -d "$PROJECT_DIR/source/.git" ]; then
        log_info "Existing repository found, updating..."
        cd "$PROJECT_DIR/source"
        for mirror in "${github_mirrors[@]}"; do
            git remote set-url origin "${mirror}/geelatobot/freight-portal.git"
            if retry_command 3 5 git pull origin main; then
                clone_success=true
                log_success "Code updated from: $mirror"
                break
            fi
        done
    fi
    
    if [ "$clone_success" = false ]; then
        log_info "Cloning new repository..."
        rm -rf "$PROJECT_DIR/source"
        for mirror in "${github_mirrors[@]}"; do
            if retry_command 3 5 git clone --depth 1 "${mirror}/geelatobot/freight-portal.git" "$PROJECT_DIR/source"; then
                clone_success=true
                log_success "Code cloned from: $mirror"
                break
            fi
        done
    fi
    
    if [ "$clone_success" = false ]; then
        log_error "Failed to download code from all mirrors"
        exit 1
    fi

    echo ""
    log_info "[4/9] Installing project dependencies (this may take a few minutes)..."
    cd "$PROJECT_DIR/source/backend"
    
    # 设置 npm 配置
    npm config set fetch-retries 5
    npm config set fetch-retry-mintimeout 20000
    npm config set fetch-retry-maxtimeout 120000
    npm config set registry https://registry.npmmirror.com
    
    if run_with_spinner "Installing npm packages" npm install --production --silent; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi

    echo ""
    log_info "[5/9] Copying configuration file..."
    cp "$CONFIG_FILE" .
    log_success "Configuration copied"

    echo ""
    log_info "[6/9] Database migration..."
    if npx prisma generate >/dev/null 2>&1; then
        log_success "Prisma client generated"
    else
        log_warn "Prisma generate had warnings"
    fi
    
    if npx prisma migrate deploy; then
        log_success "Database migration completed"
    else
        log_error "Database migration failed"
        exit 1
    fi

    echo ""
    log_info "[7/9] Building application..."
    if npm run build; then
        log_success "Application built"
    else
        log_error "Build failed"
        exit 1
    fi

    echo ""
    log_info "[8/9] Configuring Nginx..."
    cat > /etc/nginx/sites-available/freight-portal << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/freight-portal /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    if nginx -t &>/dev/null; then
        systemctl restart nginx
        log_success "Nginx configured"
    else
        log_warn "Nginx configuration test failed"
    fi

    echo ""
    log_info "[9/9] Starting service..."
    ln -sfn "$PROJECT_DIR/source/backend" "$PROJECT_DIR/current"
    cd "$PROJECT_DIR/current"
    pm2 delete freight-portal 2>/dev/null || true
    
    if pm2 start ecosystem.config.js --name freight-portal --env production; then
        pm2 save >/dev/null
        log_success "Service started"
    else
        log_error "Failed to start service"
        exit 1
    fi

    echo ""
    log_info "Health check..."
    sleep 3
    
    local health_attempts=0
    local max_health_attempts=10
    while [ $health_attempts -lt $max_health_attempts ]; do
        if curl -sf http://localhost:3000/api/v1/health >/dev/null 2>&1; then
            log_success "Service is healthy"
            break
        fi
        health_attempts=$((health_attempts + 1))
        log_info "Health check attempt $health_attempts/$max_health_attempts..."
        sleep 2
    done
    
    if [ $health_attempts -eq $max_health_attempts ]; then
        log_error "Service health check failed"
        pm2 logs freight-portal --lines 20 || true
        exit 1
    fi

    echo ""
    echo "=========================================="
    log_success "Initialization completed!"
    echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
    local server_ip
    server_ip=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')
    echo "Access URL: http://${server_ip}/api/v1/health"
    echo "Log file: $LOG_FILE"
    echo "=========================================="
}

main "$@"
