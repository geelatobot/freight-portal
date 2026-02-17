#!/bin/bash
#
# Freight Portal Rollback Script
# Version: 2.0.0
# Features: Error handling, health check, logging
#

set -o errexit
set -o nounset
set -o pipefail

# =============================================================================
# Configuration
# =============================================================================
readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="freight-portal-rollback"
readonly LOG_FILE="/var/log/${SCRIPT_NAME}.log"
readonly PROJECT_DIR="/opt/freight-portal"
readonly RELEASES_DIR="$PROJECT_DIR/releases"
readonly CURRENT_LINK="$PROJECT_DIR/current"
readonly PREVIOUS_VERSION_FILE="$PROJECT_DIR/.previous_version"

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
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║                     ROLLBACK FAILED                            ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        log_error "Rollback failed with exit code: $exit_code"
        log_info "Check log file for details: ${LOG_FILE}"
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

    log_info "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
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
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              Freight Portal - Version Rollback                 ║"
    echo "║                      Version ${SCRIPT_VERSION}                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    # 获取当前版本
    local current_version
    current_version=$(basename "$(readlink -f "$CURRENT_LINK" 2>/dev/null)" 2>/dev/null || echo "none")
    log_info "Current version: $current_version"

    # 获取上一个版本
    if [ ! -f "$PREVIOUS_VERSION_FILE" ]; then
        log_error "Previous version record not found, cannot rollback"
        log_info "Hint: The upgrade script automatically records version information"
        exit 1
    fi

    local previous_version
    previous_version=$(cat "$PREVIOUS_VERSION_FILE")
    log_info "Rolling back to: $previous_version"

    # 检查版本目录是否存在
    if [ ! -d "$RELEASES_DIR/$previous_version" ]; then
        log_error "Previous version directory does not exist: $previous_version"
        log_info "Available versions:"
        if [ -d "$RELEASES_DIR" ]; then
            ls -lt "$RELEASES_DIR" 2>/dev/null | tail -n +2 | head -5 || true
        fi
        exit 1
    fi

    # 检查是否是同一个版本
    if [ "$current_version" = "$previous_version" ]; then
        log_warn "Current version is the same as target version"
        log_info "No rollback needed"
        exit 0
    fi

    # 执行回滚
    log_info "Executing rollback..."
    
    # 备份当前失败的版本（可选）
    if [ "$current_version" != "none" ] && [ -d "$RELEASES_DIR/$current_version" ]; then
        log_info "Backing up current version: $current_version"
        mv "$RELEASES_DIR/$current_version" "$RELEASES_DIR/${current_version}-failed-$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
    fi

    # 切换版本链接
    ln -sfn "$RELEASES_DIR/$previous_version/source/backend" "$CURRENT_LINK"
    log_success "Version link updated to: $previous_version"

    # 重启服务
    log_info "Restarting service..."
    cd "$CURRENT_LINK" || exit 1
    
    # 检查 PM2 配置是否存在
    if [ -f "ecosystem.config.js" ]; then
        pm2 reload freight-portal || pm2 start ecosystem.config.js --name freight-portal --env production
    else
        log_warn "PM2 config not found, trying direct start..."
        pm2 delete freight-portal 2>/dev/null || true
        pm2 start npm --name freight-portal -- run start:prod
    fi
    
    pm2 save
    log_success "Service restarted"

    # 健康检查
    if health_check; then
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║                     ROLLBACK COMPLETE                          ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        log_success "Rollback completed successfully!"
        echo ""
        echo -e "Current version: ${YELLOW}$previous_version${NC}"
        echo ""
        local server_ip
        server_ip=$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')
        echo -e "Access URL: ${YELLOW}http://${server_ip}/api/v1/health${NC}"
        echo ""
    else
        log_error "Rollback completed but health check failed!"
        log_info "Showing last 20 lines of service logs:"
        pm2 logs freight-portal --lines 20 || true
        exit 1
    fi
}

main "$@"
