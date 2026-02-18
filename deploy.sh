#!/bin/bash
# ============================================
# 货运门户生产环境部署脚本
# ============================================

set -e  # 遇到错误立即退出

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

# 配置变量
APP_NAME="freight-portal-api"
APP_DIR="/opt/freight-portal"
BACKUP_DIR="/opt/backups/freight-portal"
LOG_DIR="/var/log/freight-portal"
GIT_REPO="https://github.com/your-org/freight-portal.git"
GIT_BRANCH="main"
NODE_VERSION="20"
PM2_NAME="freight-portal-api"

# 获取脚本参数
DEPLOY_TYPE="${1:-full}"  # full, backend, frontend
SKIP_TESTS="${2:-false}"

# 记录部署开始时间
DEPLOY_START_TIME=$(date +%s)
DEPLOY_ID=$(date +%Y%m%d_%H%M%S)

log_info "========================================"
log_info "开始部署: $APP_NAME"
log_info "部署ID: $DEPLOY_ID"
log_info "部署类型: $DEPLOY_TYPE"
log_info "跳过测试: $SKIP_TESTS"
log_info "========================================"

# ============================================
# 前置检查
# ============================================

check_prerequisites() {
    log_info "检查前置条件..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt "$NODE_VERSION" ]; then
        log_error "Node.js 版本过低，需要 $NODE_VERSION+"
        exit 1
    fi
    log_success "Node.js 版本检查通过: $(node -v)"
    
    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 未安装，请先安装: npm install -g pm2"
        exit 1
    fi
    log_success "PM2 已安装"
    
    # 检查环境变量文件
    if [ ! -f "$APP_DIR/backend/.env.production" ]; then
        log_error "生产环境配置文件不存在: $APP_DIR/backend/.env.production"
        exit 1
    fi
    log_success "生产环境配置文件存在"
    
    # 检查磁盘空间
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_error "磁盘空间不足: ${disk_usage}%"
        exit 1
    fi
    log_success "磁盘空间充足: ${disk_usage}%"
    
    # 检查内存
    local mem_available=$(free -m | awk 'NR==2{printf "%.0f", $7*100/$2}')
    if [ "$mem_available" -lt 10 ]; then
        log_warn "可用内存较低: ${mem_available}%"
    else
        log_success "内存充足"
    fi
}

# ============================================
# 备份当前版本
# ============================================

create_backup() {
    log_info "创建备份..."
    
    mkdir -p "$BACKUP_DIR"
    
    local backup_path="$BACKUP_DIR/$DEPLOY_ID"
    mkdir -p "$backup_path"
    
    # 备份代码
    if [ -d "$APP_DIR/backend/dist" ]; then
        cp -r "$APP_DIR/backend/dist" "$backup_path/"
        log_info "已备份构建产物"
    fi
    
    # 备份 package.json
    if [ -f "$APP_DIR/backend/package.json" ]; then
        cp "$APP_DIR/backend/package.json" "$backup_path/"
    fi
    
    # 备份数据库（可选）
    if command -v mysqldump &> /dev/null; then
        log_info "备份数据库..."
        source "$APP_DIR/backend/.env.production"
        local db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        local db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
        local db_user=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
        
        mysqldump -h "$db_host" -u "$db_user" -p"$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')" \
            "$db_name" > "$backup_path/database.sql" 2>/dev/null || log_warn "数据库备份失败"
    fi
    
    # 清理旧备份（保留最近30个）
    ls -t "$BACKUP_DIR" | tail -n +31 | xargs -I {} rm -rf "$BACKUP_DIR/{}" 2>/dev/null || true
    
    log_success "备份完成: $backup_path"
    echo "$backup_path" > "$BACKUP_DIR/latest"
}

# ============================================
# 拉取代码
# ============================================

pull_code() {
    log_info "拉取最新代码..."
    
    cd "$APP_DIR"
    
    # 如果目录不存在，克隆仓库
    if [ ! -d ".git" ]; then
        log_info "首次部署，克隆仓库..."
        git clone "$GIT_REPO" "$APP_DIR"
    fi
    
    # 保存当前版本
    local current_version=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo "$current_version" > "$BACKUP_DIR/previous_version"
    
    # 拉取最新代码
    git fetch origin
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
    
    local new_version=$(git rev-parse --short HEAD)
    log_success "代码更新完成: $current_version -> $new_version"
    echo "$new_version" > "$BACKUP_DIR/current_version"
}

# ============================================
# 安装依赖
# ============================================

install_dependencies() {
    log_info "安装依赖..."
    
    cd "$APP_DIR/backend"
    
    # 使用 pnpm 或 npm
    if command -v pnpm &> /dev/null; then
        pnpm install --frozen-lockfile --production
    else
        npm ci --production
    fi
    
    log_success "依赖安装完成"
}

# ============================================
# 数据库迁移
# ============================================

run_migrations() {
    log_info "执行数据库迁移..."
    
    cd "$APP_DIR/backend"
    
    # 加载环境变量
    export $(grep -v '^#' .env.production | xargs)
    
    # 生成 Prisma Client
    npx prisma generate
    
    # 执行迁移
    npx prisma migrate deploy
    
    log_success "数据库迁移完成"
}

# ============================================
# 构建应用
# ============================================

build_application() {
    log_info "构建应用..."
    
    cd "$APP_DIR/backend"
    
    # 清理旧构建
    rm -rf dist
    
    # 执行构建
    npm run build
    
    if [ ! -d "dist" ]; then
        log_error "构建失败，dist 目录不存在"
        exit 1
    fi
    
    log_success "构建完成"
}

# ============================================
# 运行测试
# ============================================

run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        log_warn "跳过测试"
        return 0
    fi
    
    log_info "运行测试..."
    
    cd "$APP_DIR/backend"
    
    # 运行单元测试
    npm run test:cov || {
        log_error "测试失败"
        exit 1
    }
    
    log_success "测试通过"
}

# ============================================
# 健康检查
# ============================================

health_check() {
    local url="${1:-http://localhost:3000/api/v1/health}"
    local max_attempts=30
    local wait_seconds=2
    
    log_info "健康检查: $url"
    
    for i in $(seq 1 $max_attempts); do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "健康检查通过"
            return 0
        fi
        
        log_info "等待服务启动... ($i/$max_attempts)"
        sleep $wait_seconds
    done
    
    log_error "健康检查失败，服务未正常启动"
    return 1
}

# ============================================
# 部署应用
# ============================================

deploy_application() {
    log_info "部署应用..."
    
    cd "$APP_DIR/backend"
    
    # 检查 PM2 进程是否存在
    local is_running=$(pm2 list | grep "$PM2_NAME" | wc -l)
    
    if [ "$is_running" -gt 0 ]; then
        log_info "更新现有进程..."
        pm2 reload ecosystem.config.js --env production
    else
        log_info "启动新进程..."
        pm2 start ecosystem.config.js --env production
    fi
    
    # 保存 PM2 配置
    pm2 save
    
    # 等待服务启动
    sleep 3
    
    # 健康检查
    if health_check; then
        log_success "部署成功"
    else
        log_error "部署失败，执行回滚"
        rollback
        exit 1
    fi
}

# ============================================
# 回滚
# ============================================

rollback() {
    log_warn "执行回滚..."
    
    local backup_path=$(cat "$BACKUP_DIR/latest" 2>/dev/null)
    
    if [ -z "$backup_path" ] || [ ! -d "$backup_path" ]; then
        log_error "没有找到备份，无法回滚"
        exit 1
    fi
    
    # 停止当前服务
    pm2 stop "$PM2_NAME" || true
    
    # 恢复备份
    if [ -d "$backup_path/dist" ]; then
        rm -rf "$APP_DIR/backend/dist"
        cp -r "$backup_path/dist" "$APP_DIR/backend/"
    fi
    
    # 重启服务
    pm2 start ecosystem.config.js --env production
    
    log_success "回滚完成"
}

# ============================================
# 清理
# ============================================

cleanup() {
    log_info "清理临时文件..."
    
    # 清理 npm 缓存
    npm cache clean --force 2>/dev/null || true
    
    # 清理旧日志
    find "$LOG_DIR" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    log_success "清理完成"
}

# ============================================
# 发送通知
# ============================================

send_notification() {
    local status=$1
    local duration=$2
    
    local message="部署${status}: $APP_NAME
部署ID: $DEPLOY_ID
版本: $(cat $BACKUP_DIR/current_version 2>/dev/null || echo 'unknown')
耗时: ${duration}s
时间: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 可以在这里添加企业微信、钉钉等通知
    log_info "$message"
}

# ============================================
# 主流程
# ============================================

main() {
    local exit_code=0
    
    # 检查是否为回滚操作
    if [ "$DEPLOY_TYPE" = "rollback" ]; then
        rollback
        exit 0
    fi
    
    # 执行部署流程
    check_prerequisites
    create_backup
    pull_code
    install_dependencies
    
    if [ "$DEPLOY_TYPE" = "full" ] || [ "$DEPLOY_TYPE" = "backend" ]; then
        run_migrations
        build_application
        run_tests
        deploy_application
    fi
    
    cleanup
    
    # 计算部署耗时
    local deploy_end_time=$(date +%s)
    local duration=$((deploy_end_time - DEPLOY_START_TIME))
    
    log_success "========================================"
    log_success "部署完成!"
    log_success "部署ID: $DEPLOY_ID"
    log_success "耗时: ${duration}秒"
    log_success "========================================"
    
    send_notification "成功" "$duration"
    
    # 显示 PM2 状态
    pm2 list
    
    exit 0
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"; send_notification "失败" "0"; exit 1' ERR

# 执行主流程
main
