#!/bin/bash
#
# Freight Portal Installation Script
# Reference: Docker, K8s, NodeSource best practices
# Features: Error handling, detailed logging, retry logic, progress tracking
#

set -o errexit
set -o nounset
set -o pipefail

# =============================================================================
# Configuration
# =============================================================================
readonly SCRIPT_VERSION="2.1.0"
readonly SCRIPT_NAME="freight-portal-installer"
readonly PROJECT_DIR="/opt/freight-portal"
readonly CONFIG_DIR="${PROJECT_DIR}/shared"
readonly CONFIG_FILE="${CONFIG_DIR}/.env"
readonly LOG_FILE="/var/log/${SCRIPT_NAME}.log"
readonly LOCK_FILE="/var/run/${SCRIPT_NAME}.lock"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly GRAY='\033[0;37m'
readonly NC='\033[0m'

# Counters
TOTAL_STEPS=11
CURRENT_STEP=0

# =============================================================================
# Logging Functions
# =============================================================================

# Initialize logging
init_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Log file: ${LOG_FILE}"
}

# Log levels
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

log_debug() {
    printf "${GRAY}[%s] [DEBUG]${NC} %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

# =============================================================================
# Progress Display
# =============================================================================

show_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  Freight Portal Installer                      ║"
    echo "║                      Version ${SCRIPT_VERSION}                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

show_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local title="$1"
    echo ""
    echo "┌────────────────────────────────────────────────────────────────┐"
    printf "│ Step %2d/%d: %-50s │\n" "$CURRENT_STEP" "$TOTAL_STEPS" "$title"
    echo "└────────────────────────────────────────────────────────────────┘"
    log_info "Starting: $title"
}

show_progress() {
    local message="$1"
    printf "    → %s...\n" "$message"
}

show_success() {
    log_success "$1"
}

show_error() {
    log_error "$1"
}

# =============================================================================
# Error Handling
# =============================================================================

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║                     INSTALLATION FAILED                        ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        log_error "Installation failed with exit code: $exit_code"
        log_info "Check log file for details: ${LOG_FILE}"
        log_info "To retry, run the script again"
    fi
    rm -f "$LOCK_FILE"
    exit $exit_code
}

trap cleanup EXIT

# Check if already running
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            log_error "Script is already running (PID: $pid)"
            exit 1
        fi
    fi
    echo $$ > "$LOCK_FILE"
}

# =============================================================================
# Command Execution with Retry
# =============================================================================

# Execute command with retry logic
# Usage: retry [retries] [delay] command
retry() {
    local retries=$1
    local delay=$2
    shift 2
    local count=0

    while [ $count -lt $retries ]; do
        if "$@"; then
            return 0
        fi
        count=$((count + 1))
        log_warn "Command failed (attempt $count/$retries): $*"
        if [ $count -lt $retries ]; then
            log_info "Retrying in ${delay} seconds..."
            sleep "$delay"
        fi
    done

    log_error "Command failed after $retries attempts: $*"
    return 1
}

# Execute command with timeout and progress
# Usage: run_with_timeout [timeout_seconds] [message] command
run_with_timeout() {
    local timeout=$1
    local message="$2"
    shift 2
    local pid

    show_progress "$message"
    log_debug "Executing: $*"

    # Run command in background
    "$@" &
    pid=$!

    # Wait with simple spinner
    local count=0
    while kill -0 $pid 2>/dev/null; do
        count=$((count + 1))
        if [ $count -gt 600 ]; then  # 60 seconds timeout for spinner
            break
        fi
        sleep 0.1
    done

    echo ""

    # Get exit code
    wait $pid
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        printf "    [OK] %s\n" "$message"
    fi
    
    return $exit_code
}

# =============================================================================
# System Detection
# =============================================================================

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    else
        echo "unknown"
    fi
}

detect_cloud_provider() {
    log_info "Detecting cloud provider..."

    # Alibaba Cloud
    if retry 3 2 curl -s --connect-timeout 3 "http://100.100.100.200/latest/meta-data/instance-id" > /dev/null 2>&1; then
        echo "aliyun"
        return
    fi

    # Tencent Cloud
    if retry 3 2 curl -s --connect-timeout 3 "http://metadata.tencentyun.com/latest/meta-data/instance-id" > /dev/null 2>&1; then
        echo "tencent"
        return
    fi

    # Huawei Cloud
    if retry 3 2 curl -s --connect-timeout 3 "http://169.254.169.254/openstack/latest/meta_data.json" > /dev/null 2>&1; then
        echo "huawei"
        return
    fi

    # AWS
    if retry 3 2 curl -s --connect-timeout 3 "http://169.254.169.254/latest/meta-data/instance-id" > /dev/null 2>&1; then
        echo "aws"
        return
    fi

    # Azure
    if retry 3 2 curl -s --connect-timeout 3 -H "Metadata:true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" > /dev/null 2>&1; then
        echo "azure"
        return
    fi

    echo "unknown"
}

# =============================================================================
# GitHub Mirror Selection
# =============================================================================

# 可用的GitHub镜像列表（按优先级排序）
declare -a GITHUB_MIRRORS=(
    "https://ghps.cc/https://github.com"
    "https://gh.api.99988866.xyz/https://github.com"
    "https://kkgithub.com"
    "https://github.com"
)

# 测试GitHub镜像可用性
test_github_mirror() {
    local mirror="$1"
    local test_url="${mirror}/geelatobot/freight-portal.git"
    
    log_debug "Testing mirror: $mirror"
    
    # 使用git ls-remote测试连接
    if timeout 10 git ls-remote --exit-code "$test_url" HEAD > /dev/null 2>&1; then
        log_info "Mirror available: $mirror"
        return 0
    else
        log_warn "Mirror unavailable: $mirror"
        return 1
    fi
}

# 获取可用的GitHub镜像
get_available_github_mirror() {
    local cloud="$1"
    
    # 如果是国内云服务商，优先测试镜像
    if [[ "$cloud" =~ ^(aliyun|tencent|huawei)$ ]]; then
        log_info "Testing GitHub mirrors for China..."
        for mirror in "${GITHUB_MIRRORS[@]}"; do
            if test_github_mirror "$mirror"; then
                echo "$mirror"
                return 0
            fi
        done
        log_warn "All mirrors failed, falling back to direct GitHub"
    fi
    
    echo "https://github.com"
}

# =============================================================================
# Mirror Configuration
# =============================================================================

step_configure_mirrors() {
    local cloud=$1
    local os=$(detect_os)

    log_info "Configuring mirrors for: $cloud on $os"

    case $cloud in
        aliyun)
            log_info "Using Alibaba Cloud mirrors"
            # npm使用阿里云镜像
            npm config set registry https://registry.npmmirror.com
            # apt使用阿里云镜像
            if [ "$os" = "ubuntu" ] || [ "$os" = "debian" ]; then
                sed -i 's|http://.*archive.ubuntu.com|http://mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null || true
                sed -i 's|http://.*security.ubuntu.com|http://mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null || true
                sed -i 's|http://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null || true
            fi
            ;;
        tencent)
            log_info "Using Tencent Cloud mirrors"
            npm config set registry https://mirrors.cloud.tencent.com/npm/
            if [ "$os" = "ubuntu" ] || [ "$os" = "debian" ]; then
                sed -i 's|http://.*archive.ubuntu.com|http://mirrors.tencentyun.com|g' /etc/apt/sources.list 2>/dev/null || true
                sed -i 's|http://.*security.ubuntu.com|http://mirrors.tencentyun.com|g' /etc/apt/sources.list 2>/dev/null || true
            fi
            ;;
        huawei)
            log_info "Using Huawei Cloud mirrors"
            npm config set registry https://mirrors.huaweicloud.com/repository/npm/
            if [ "$os" = "ubuntu" ] || [ "$os" = "debian" ]; then
                sed -i 's|http://.*archive.ubuntu.com|https://repo.huaweicloud.com|g' /etc/apt/sources.list 2>/dev/null || true
            fi
            ;;
        *)
            log_info "Using default mirrors (Taobao npm)"
            npm config set registry https://registry.npmmirror.com
            ;;
    esac

    log_info "NPM registry: $(npm config get registry)"
}

# =============================================================================
# Main Installation Steps
# =============================================================================

step_check_config() {
    show_step "Check Configuration"

    if [ ! -f "$CONFIG_FILE" ]; then
        show_error "Configuration file not found: $CONFIG_FILE"
        echo ""
        echo "Please create the configuration file first:"
        echo "  mkdir -p $CONFIG_DIR"
        echo "  nano $CONFIG_FILE"
        echo ""
        echo "Example configuration:"
        cat << 'EXAMPLE'
DATABASE_URL="mysql://username:password@host:3306/database"
JWT_SECRET=""
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="production"
API_PREFIX="/api/v1"
FOURPORTUN_API_URL="https://prod-api.4portun.com"
FOURPORTUN_APPID=""
FOURPORTUN_SECRET=""
KIMI_API_KEY=""
EXAMPLE
        exit 1
    fi

    show_progress "Loading configuration"
    set -a
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
    set +a
    show_success "Configuration loaded"

    # Generate JWT if not set
    if [ -z "${JWT_SECRET:-}" ]; then
        show_progress "Generating JWT secret"
        JWT_SECRET="fp-$(date +%s)-$(openssl rand -hex 16)"
        # 使用更健壮的sed替换
        if grep -q "^JWT_SECRET=" "$CONFIG_FILE"; then
            sed -i "s/^JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" "$CONFIG_FILE"
        else
            echo "JWT_SECRET=\"$JWT_SECRET\"" >> "$CONFIG_FILE"
        fi
        show_success "JWT secret generated and saved"
    fi

    log_debug "Database URL: ${DATABASE_URL//:*@/:***@}"
}

step_install_system_deps() {
    show_step "Install System Dependencies"

    show_progress "Updating package lists"
    run_with_timeout 120 "apt-get update" apt-get update -qq
    show_success "Package lists updated"

    show_progress "Installing required packages"
    run_with_timeout 180 "install packages" apt-get install -y -qq curl git nginx openssl
    show_success "System dependencies installed"
}

step_install_nodejs() {
    show_step "Install Node.js"

    show_progress "Downloading NodeSource setup script"
    run_with_timeout 60 "download nodesource" curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
    show_success "NodeSource script downloaded"

    show_progress "Running NodeSource setup"
    bash /tmp/nodesource_setup.sh > /dev/null 2>&1
    show_success "NodeSource setup complete"

    show_progress "Installing Node.js"
    run_with_timeout 120 "install nodejs" apt-get install -y -qq nodejs
    show_success "Node.js installed: $(node -v)"

    show_progress "Installing PM2"
    run_with_timeout 60 "install pm2" npm install -g pm2
    show_success "PM2 installed: $(pm2 -v)"
}

step_download_code() {
    show_step "Download Source Code"

    # 获取可用的GitHub镜像
    local cloud=$1
    local github_mirror
    github_mirror=$(get_available_github_mirror "$cloud")
    
    log_info "Using GitHub mirror: $github_mirror"

    if [ -d "${PROJECT_DIR}/source/.git" ]; then
        show_progress "Updating existing code"
        cd "${PROJECT_DIR}/source"
        
        # 如果是国内服务器，优先使用镜像更新
        if [[ "$cloud" =~ ^(aliyun|tencent|huawei)$ ]] && [ "$github_mirror" != "https://github.com" ]; then
            log_info "Using mirror for update: $github_mirror"
            git remote set-url origin "${github_mirror}/geelatobot/freight-portal.git"
            if run_with_timeout 60 "git pull" git pull origin main; then
                # 更新成功后切换回官方源
                git remote set-url origin https://github.com/geelatobot/freight-portal.git
                show_success "Source code updated from mirror"
                return
            else
                log_warn "Mirror update failed, trying official GitHub..."
                git remote set-url origin https://github.com/geelatobot/freight-portal.git
            fi
        fi
        
        # 使用官方源更新
        run_with_timeout 60 "git pull" git pull origin main
    else
        show_progress "Cloning repository (may take 1-2 minutes)..."
        mkdir -p "$PROJECT_DIR"
        
        # 尝试使用镜像克隆
        if [ "$github_mirror" != "https://github.com" ]; then
            log_info "Trying mirror: $github_mirror"
            if run_with_timeout 120 "git clone" git clone --depth 1 "${github_mirror}/geelatobot/freight-portal.git" "${PROJECT_DIR}/source" || true; then
                if [ -d "${PROJECT_DIR}/source/.git" ]; then
                    # 克隆成功后，切换回官方源以便后续更新
                    cd "${PROJECT_DIR}/source"
                    git remote set-url origin https://github.com/geelatobot/freight-portal.git
                    show_success "Source code cloned from mirror"
                    return
                fi
            fi
            log_warn "Mirror failed, trying official GitHub..."
        fi
        
        # 使用官方源
        run_with_timeout 180 "git clone" git clone --depth 1 https://github.com/geelatobot/freight-portal.git "${PROJECT_DIR}/source"
    fi
    show_success "Source code ready"
}

# =============================================================================
# Prisma Schema Check and Fix
# =============================================================================

step_check_and_fix_schema() {
    show_step "Check and Fix Prisma Schema"

    local schema_file="${PROJECT_DIR}/source/backend/prisma/schema.prisma"
    
    if [ ! -f "$schema_file" ]; then
        log_warn "Schema file not found, skipping check"
        return 0
    fi

    show_progress "Checking for duplicate model definitions"
    
    # 需要检查的模型列表
    local models=("Shipment" "Order" "Bill" "User" "Company" "Customer" "ShipmentNode" "Document" "BillItem" "Invoice" "Payment" "AuditLog" "ApiLog" "SystemConfig" "Notification" "RefreshToken")
    
    local has_duplicate=false
    local duplicate_models=""
    
    for model in "${models[@]}"; do
        local count
        count=$(grep -c "^model $model {" "$schema_file" 2>/dev/null || echo 0)
        if [ "$count" -gt 1 ]; then
            log_error "Model '$model' is defined $count times"
            has_duplicate=true
            duplicate_models="$duplicate_models $model"
        fi
    done
    
    if [ "$has_duplicate" = true ]; then
        show_progress "Found duplicate models, attempting to fix"
        
        # 备份原文件
        cp "$schema_file" "${schema_file}.bak.$(date +%Y%m%d%H%M%S)"
        
        # 查找并删除从 "// 索引优化" 或类似注释开始的重复定义块
        # 这些通常是 execute-all-tasks.sh 旧版本添加的
        local temp_file="${schema_file}.tmp"
        
        # 使用 awk 删除重复：保留第一个模型定义，删除后面的
        awk '
            /^model [A-Za-z]+ \{/ {
                model_name = $2
                if (models[model_name]) {
                    # 跳过这个模型及其所有内容直到下一个模型或枚举
                    skip = 1
                    next
                }
                models[model_name] = 1
            }
            skip && /^model [A-Za-z]+ \{/ {
                # 遇到新模型，停止跳过
                skip = 0
                model_name = $2
                if (models[model_name]) {
                    skip = 1
                    next
                }
                models[model_name] = 1
            }
            skip && /^enum [A-Za-z]+ \{/ {
                # 遇到枚举，停止跳过
                skip = 0
            }
            !skip { print }
        ' "$schema_file" > "$temp_file"
        
        # 检查修复后的文件
        local still_has_duplicate=false
        for model in "${models[@]}"; do
            local count_after
            count_after=$(grep -c "^model $model {" "$temp_file" 2>/dev/null || echo 0)
            if [ "$count_after" -gt 1 ]; then
                log_error "Model '$model' still has $count_after definitions after fix attempt"
                still_has_duplicate=true
            fi
        done
        
        if [ "$still_has_duplicate" = false ]; then
            mv "$temp_file" "$schema_file"
            show_success "Schema fixed - duplicate models removed"
        else
            rm -f "$temp_file"
            log_error "Automatic fix failed, please check schema manually"
            log_info "Backup saved at: ${schema_file}.bak.*"
            exit 1
        fi
    else
        show_success "Schema is clean - no duplicate models"
    fi
}

step_install_npm_deps() {
    show_step "Install NPM Dependencies"

    cd "${PROJECT_DIR}/source/backend"

    log_info "Current npm registry: $(npm config get registry)"
    
    # 设置 npm 以加速安装
    npm config set fetch-retries 5
    npm config set fetch-retry-mintimeout 20000
    npm config set fetch-retry-maxtimeout 120000
    
    show_progress "Installing all npm packages (for build)..."
    log_info "This may take 3-5 minutes, please wait..."
    
    # 安装所有依赖（包括 devDependencies，用于构建）
    # 使用 --production=false 强制安装 devDependencies
    if [ -f "package-lock.json" ]; then
        npm ci --production=false 2>&1 | tee -a "$LOG_FILE" || {
            log_error "npm ci failed"
            exit 1
        }
    else
        npm install --production=false 2>&1 | tee -a "$LOG_FILE" || {
            log_error "npm install failed"
            exit 1
        }
    fi
    
    show_success "All dependencies installed"
}

step_database_migration() {
    show_step "Database Migration"

    cd "${PROJECT_DIR}/source/backend"

    show_progress "Copying configuration file"
    cp "$CONFIG_FILE" .
    show_success "Configuration copied"

    show_progress "Generating Prisma client"
    # 使用本地安装的 prisma，避免 npx 版本问题
    if [ -f "./node_modules/.bin/prisma" ]; then
        ./node_modules/.bin/prisma generate 2>&1 | tee -a "$LOG_FILE" | tail -5
    else
        npx prisma generate 2>&1 | tee -a "$LOG_FILE" | tail -5
    fi
    show_success "Prisma client generated"

    show_progress "Running database migrations"
    if [ -f "./node_modules/.bin/prisma" ]; then
        ./node_modules/.bin/prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
    else
        npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
    fi
    show_success "Database migrations complete"
}

step_build_application() {
    show_step "Build Application"

    cd "${PROJECT_DIR}/source/backend"

    show_progress "Compiling TypeScript (production mode)..."
    # 使用生产模式构建
    NODE_ENV=production ./node_modules/.bin/nest build 2>&1 | tee -a "$LOG_FILE" | tail -10
    show_success "Application built successfully"
}

step_configure_nginx() {
    show_step "Configure Nginx"

    show_progress "Creating Nginx configuration"
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
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://localhost:3000/api/v1/health;
        access_log off;
    }
}
EOF

    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/freight-portal /etc/nginx/sites-enabled/

    show_progress "Testing Nginx configuration"
    nginx -t 2>&1 | tee -a "$LOG_FILE"

    show_progress "Restarting Nginx"
    systemctl restart nginx

    show_success "Nginx configured"
}

step_start_service() {
    show_step "Start Service"

    show_progress "Creating symbolic link"
    ln -sfn "${PROJECT_DIR}/source/backend" "${PROJECT_DIR}/current"
    cd "${PROJECT_DIR}/current"

    show_progress "Stopping old service (if exists)"
    pm2 delete freight-portal 2>/dev/null || true

    show_progress "Starting new service"
    pm2 start ecosystem.config.js --name freight-portal --env production
    pm2 save

    show_success "Service started"
}

step_health_check() {
    show_step "Health Check"

    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        show_progress "Health check attempt $attempt/$max_attempts"
        if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
            show_success "Service is healthy"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done

    show_error "Health check failed after $max_attempts attempts"
    log_info "Showing last 20 lines of service logs:"
    pm2 logs freight-portal --lines 20 || true
    exit 1
}

# =============================================================================
# Main
# =============================================================================

main() {
    show_header
    init_logging
    check_lock

    log_info "Starting installation..."
    log_info "OS: $(detect_os)"
    log_info "Architecture: $(uname -m)"
    
    # 检测云服务商并保存到全局变量
    CLOUD_PROVIDER=$(detect_cloud_provider)
    log_info "Cloud Provider: $CLOUD_PROVIDER"

    step_check_config
    step_configure_mirrors "$CLOUD_PROVIDER"
    step_install_system_deps
    step_install_nodejs
    step_download_code "$CLOUD_PROVIDER"
    step_check_and_fix_schema
    step_install_npm_deps
    step_database_migration
    step_build_application
    step_configure_nginx
    step_start_service
    step_health_check

    # Success
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  INSTALLATION COMPLETE                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Freight Portal installed successfully!"
    echo ""
    echo "  Cloud Provider: ${CYAN}${CLOUD_PROVIDER}${NC}"
    echo "  NPM Registry:   ${CYAN}$(npm config get registry)${NC}"
    echo "  Access URL:     ${CYAN}http://$(curl -s ifconfig.me)/api/v1/health${NC}"
    echo "  Log File:       ${CYAN}${LOG_FILE}${NC}"
    echo ""
    echo "  Useful commands:"
    echo "    pm2 logs freight-portal     # View logs"
    echo "    pm2 restart freight-portal  # Restart service"
    echo "    pm2 status                  # Check status"
    echo ""
}

main "$@"
