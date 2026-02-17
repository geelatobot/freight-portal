#!/bin/bash
#
# Freight Portal Auto Upgrade Script
# Version: 2.0.0
# Features: Backup, upgrade, rollback, health check
#

set -o errexit
set -o nounset
set -o pipefail

# =============================================================================
# Configuration
# =============================================================================
readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="freight-portal-upgrade"
readonly LOG_FILE="/var/log/${SCRIPT_NAME}.log"
readonly PROJECT_DIR="/opt/freight-portal"
readonly CONFIG_DIR="$PROJECT_DIR/shared"
readonly RELEASES_DIR="$PROJECT_DIR/releases"
readonly CURRENT_LINK="$PROJECT_DIR/current"
readonly PREVIOUS_VERSION_FILE="$PROJECT_DIR/.previous_version"
readonly MAX_RELEASES=5  # 保留最近5个版本

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# 生成版本号
readonly VERSION=$(date +%Y%m%d-%H%M%S)
readonly RELEASE_DIR="$RELEASES_DIR/$VERSION"

# =============================================================================
# Logging Functions
# =============================================================================

init_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
    log_info "========================================"
    log_info "Upgrade started at $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "New version: $VERSION"
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
        log_error "Upgrade failed with exit code: $exit_code"
        
        # 尝试自动回滚
        if [ -f "$PREVIOUS_VERSION_FILE" ]; then
            log_warn "Attempting automatic rollback..."
            if [ -x "$PROJECT_DIR/scripts/rollback-freight-portal.sh" ]; then
                "$PROJECT_DIR/scripts/rollback-freight-portal.sh" || true
            fi
        fi
    fi
    exit $exit_code
}

trap cleanup EXIT

# =============================================================================
# Helper Functions
# =============================================================================

# 解析 DATABASE_URL 的健壮方法
parse_database_url() {
    local url="$1"
    local field="$2"
    
    case $field in
        host)
            echo "$url" | sed -n 's|.*@\([^:]*\):.*|\1|p'
            ;;
        port)
            echo "$url" | sed -n 's|.*@.*:\([0-9]*\)/.*|\1|p'
            ;;
        user)
            echo "$url" | sed -n 's|.*://\([^:]*\):.*@.*|\1|p'
            ;;
        password)
            echo "$url" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p'
            ;;
        database)
            echo "$url" | sed -n 's|.*/\([^?]*\).*|\1|p'
            ;;
        *)
            echo ""
            ;;
    esac
}

# 健康检查
health_check() {
    local max_attempts=${1:-10}
    local attempt=1

    log_info "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        log_info "Health check attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done

    return 1
}

# =============================================================================
# Main
# =============================================================================

main() {
    init_logging

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              Freight Portal - Auto Upgrade                     ║"
    echo "║                      Version ${SCRIPT_VERSION}                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    # 获取当前版本
    local current_version
    current_version=$(basename "$(readlink -f "$CURRENT_LINK" 2>/dev/null)" 2>/dev/null || echo "none")
    log_info "Current version: $current_version"
    log_info "New version: $VERSION"
    echo ""

    # =============================================================================
    # 步骤1: 备份当前版本
    # =============================================================================
    log_info "[1/7] Backing up current version..."
    if [ "$current_version" != "none" ]; then
        echo "$current_version" > "$PREVIOUS_VERSION_FILE"
        log_success "Current version recorded: $current_version"
    else
        log_warn "No current version found, skipping backup"
    fi

    # =============================================================================
    # 步骤2: 数据库备份
    # =============================================================================
    echo ""
    log_info "[2/7] Database backup..."
    
    if [ ! -f "$CONFIG_DIR/.env" ]; then
        log_warn "Config file not found, skipping database backup"
    else
        # shellcheck source=/dev/null
        source "$CONFIG_DIR/.env"
        
        local backup_file="$CONFIG_DIR/backup/db-$VERSION.sql"
        mkdir -p "$CONFIG_DIR/backup"

        if command -v mysqldump >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
            log_info "Parsing database connection info..."
            
            local db_host db_user db_pass db_name
            db_host=$(parse_database_url "$DATABASE_URL" "host")
            db_user=$(parse_database_url "$DATABASE_URL" "user")
            db_pass=$(parse_database_url "$DATABASE_URL" "password")
            db_name=$(parse_database_url "$DATABASE_URL" "database")
            
            if [ -n "$db_host" ] && [ -n "$db_user" ] && [ -n "$db_name" ]; then
                log_info "Backing up database: $db_name@$db_host"
                
                # 使用 MYSQL_PWD 环境变量避免密码暴露在命令行
                export MYSQL_PWD="$db_pass"
                if mysqldump --no-table-space -h "$db_host" -u "$db_user" "$db_name" > "$backup_file" 2>&1; then
                    unset MYSQL_PWD
                    log_success "Database backup completed: $backup_file"
                else
                    unset MYSQL_PWD
                    log_warn "Database backup failed (check credentials)"
                fi
            else
                log_warn "Could not parse database URL, skipping backup"
            fi
        else
            log_warn "mysqldump not installed or DATABASE_URL not set, skipping backup"
        fi
    fi

    # =============================================================================
    # 步骤3: 下载新版本代码
    # =============================================================================
    echo ""
    log_info "[3/7] Downloading new version..."
    mkdir -p "$RELEASE_DIR"
    
    # 尝试多个镜像源
    local github_mirrors=(
        "https://ghps.cc/https://github.com"
        "https://gh.api.99988866.xyz/https://github.com"
        "https://kkgithub.com"
        "https://github.com"
    )
    
    local clone_success=false
    for mirror in "${github_mirrors[@]}"; do
        log_info "Trying mirror: $mirror"
        if git clone --depth 1 "${mirror}/geelatobot/freight-portal.git" "$RELEASE_DIR/source" 2>&1; then
            clone_success=true
            log_success "Code downloaded from: $mirror"
            break
        else
            log_warn "Mirror failed: $mirror"
        fi
    done
    
    if [ "$clone_success" = false ]; then
        log_error "Failed to clone repository from all mirrors"
        exit 1
    fi

    # =============================================================================
    # 步骤4: 安装依赖
    # =============================================================================
    echo ""
    log_info "[4/7] Installing dependencies..."
    cd "$RELEASE_DIR/source/backend"
    
    # 设置 npm 配置
    npm config set fetch-retries 5
    npm config set fetch-retry-mintimeout 20000
    npm config set fetch-retry-maxtimeout 120000
    
    # 安装依赖
    if [ -f "package-lock.json" ]; then
        npm ci --production 2>&1 | tee -a "$LOG_FILE"
    else
        npm install --production 2>&1 | tee -a "$LOG_FILE"
    fi
    
    log_success "Dependencies installed"

    # =============================================================================
    # 步骤5: 配置环境
    # =============================================================================
    echo ""
    log_info "[5/7] Configuring environment..."
    cp "$CONFIG_DIR/.env" .
    
    # 创建符号链接
    mkdir -p logs uploads
    if [ -d "$CONFIG_DIR/logs" ]; then
        ln -sf "$CONFIG_DIR/logs" logs 2>/dev/null || true
    fi
    if [ -d "$CONFIG_DIR/uploads" ]; then
        ln -sf "$CONFIG_DIR/uploads" uploads 2>/dev/null || true
    fi
    
    log_success "Environment configured"

    # =============================================================================
    # 步骤6: 数据库迁移
    # =============================================================================
    echo ""
    log_info "[6/7] Database migration..."
    npx prisma generate 2>&1 | tee -a "$LOG_FILE"
    npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
    log_success "Database migration completed"

    # =============================================================================
    # 步骤7: 构建并切换版本
    # =============================================================================
    echo ""
    log_info "[7/7] Building application..."
    npm run build 2>&1 | tee -a "$LOG_FILE"
    log_success "Application built"

    # 切换版本
    echo ""
    log_info "Switching version..."
    ln -sfn "$RELEASE_DIR/source/backend" "$CURRENT_LINK"

    # 平滑重启
    cd "$CURRENT_LINK"
    pm2 reload freight-portal 2>&1 || pm2 restart freight-portal 2>&1
    pm2 save
    log_success "Service reloaded"

    # =============================================================================
    # 健康检查
    # =============================================================================
    echo ""
    log_info "Health check..."
    
    if health_check; then
        # 清理旧版本
        echo ""
        log_info "Cleaning up old versions..."
        cd "$RELEASES_DIR"
        local versions_to_delete
        versions_to_delete=$(ls -t 2>/dev/null | tail -n +$((MAX_RELEASES + 1)) || true)
        if [ -n "$versions_to_delete" ]; then
            echo "$versions_to_delete" | xargs -r rm -rf 2>/dev/null || true
            log_success "Old versions cleaned up"
        fi

        # 完成
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║                     UPGRADE SUCCESSFUL                         ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        log_success "Upgrade completed successfully!"
        echo ""
        echo -e "New version: ${GREEN}$VERSION${NC}"
        echo -e "Old version: ${YELLOW}$current_version${NC} (kept for rollback)"
        echo ""
        local server_ip
        server_ip=$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')
        echo -e "Access URL: ${YELLOW}http://${server_ip}/api/v1/health${NC}"
        echo ""
        exit 0
    else
        log_error "Health check failed!"
        exit 1
    fi
}

main "$@"
