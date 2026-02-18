#!/bin/bash
# ============================================
# 货运门户回滚脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
APP_DIR="/opt/freight-portal"
BACKUP_DIR="/opt/backups/freight-portal"
PM2_NAME="freight-portal-api"

# 获取参数
ROLLBACK_VERSION="$1"  # 可选，指定版本

# ============================================
# 列出可用备份
# ============================================

list_backups() {
    log_info "可用备份列表:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "备份目录不存在"
        exit 1
    fi
    
    local count=0
    for backup in $(ls -t "$BACKUP_DIR" | grep -E '^[0-9]{8}_[0-9]{6}$'); do
        count=$((count + 1))
        local backup_path="$BACKUP_DIR/$backup"
        local size=$(du -sh "$backup_path" 2>/dev/null | cut -f1)
        local time=$(echo $backup | sed 's/_/ /')
        
        # 获取版本信息
        local version="unknown"
        if [ -f "$backup_path/version.txt" ]; then
            version=$(cat "$backup_path/version.txt")
        fi
        
        echo "  [$count] $backup (${size}) - $version"
    done
    
    if [ $count -eq 0 ]; then
        log_error "没有可用的备份"
        exit 1
    fi
    
    return 0
}

# ============================================
# 执行回滚
# ============================================

perform_rollback() {
    local target_version="$1"
    local backup_path=""
    
    # 确定回滚目标
    if [ -z "$target_version" ]; then
        # 回滚到上一个版本
        backup_path=$(cat "$BACKUP_DIR/latest" 2>/dev/null)
        
        if [ -z "$backup_path" ] || [ ! -d "$backup_path" ]; then
            log_error "没有找到最新备份"
            exit 1
        fi
    else
        # 回滚到指定版本
        backup_path="$BACKUP_DIR/$target_version"
        
        if [ ! -d "$backup_path" ]; then
            log_error "指定的备份不存在: $target_version"
            list_backups
            exit 1
        fi
    fi
    
    log_warn "========================================"
    log_warn "准备回滚到: $(basename $backup_path)"
    log_warn "备份路径: $backup_path"
    log_warn "========================================"
    
    # 确认提示
    if [ -z "$FORCE_ROLLBACK" ]; then
        read -p "确认回滚? [y/N]: " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            log_info "取消回滚"
            exit 0
        fi
    fi
    
    # 记录当前状态
    local rollback_time=$(date +%Y%m%d_%H%M%S)
    echo "$rollback_time" > "$BACKUP_DIR/rollback_time"
    
    # 停止当前服务
    log_info "停止当前服务..."
    pm2 stop "$PM2_NAME" || true
    
    # 备份当前状态（用于撤销回滚）
    local current_backup="$BACKUP_DIR/current_before_rollback_$rollback_time"
    mkdir -p "$current_backup"
    
    if [ -d "$APP_DIR/backend/dist" ]; then
        cp -r "$APP_DIR/backend/dist" "$current_backup/"
    fi
    if [ -f "$APP_DIR/backend/package.json" ]; then
        cp "$APP_DIR/backend/package.json" "$current_backup/"
    fi
    
    # 恢复代码
    log_info "恢复代码..."
    if [ -d "$backup_path/dist" ]; then
        rm -rf "$APP_DIR/backend/dist"
        cp -r "$backup_path/dist" "$APP_DIR/backend/"
        log_success "代码恢复完成"
    else
        log_warn "备份中没有 dist 目录，尝试使用 git 回滚..."
        
        if [ -f "$backup_path/version.txt" ]; then
            local git_version=$(cat "$backup_path/version.txt")
            cd "$APP_DIR"
            git checkout "$git_version"
            
            cd "$APP_DIR/backend"
            npm ci --production
            npm run build
        fi
    fi
    
    # 恢复 package.json
    if [ -f "$backup_path/package.json" ]; then
        cp "$backup_path/package.json" "$APP_DIR/backend/"
    fi
    
    # 数据库回滚（如果有备份）
    if [ -f "$backup_path/database.sql" ]; then
        log_warn "检测到数据库备份"
        read -p "是否恢复数据库? [y/N]: " restore_db
        if [[ $restore_db =~ ^[Yy]$ ]]; then
            log_info "恢复数据库..."
            source "$APP_DIR/backend/.env.production"
            local db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
            local db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
            local db_user=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
            local db_pass=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')
            
            mysql -h "$db_host" -u "$db_user" -p"$db_pass" "$db_name" < "$backup_path/database.sql"
            log_success "数据库恢复完成"
        fi
    fi
    
    # 重启服务
    log_info "重启服务..."
    cd "$APP_DIR/backend"
    pm2 start ecosystem.config.js --env production
    
    # 健康检查
    log_info "执行健康检查..."
    local max_attempts=30
    local wait_seconds=2
    local health_url="http://localhost:3000/api/v1/health"
    
    for i in $(seq 1 $max_attempts); do
        if curl -sf "$health_url" > /dev/null 2>&1; then
            log_success "健康检查通过"
            break
        fi
        
        if [ $i -eq $max_attempts ]; then
            log_error "健康检查失败，回滚可能未成功"
            exit 1
        fi
        
        log_info "等待服务启动... ($i/$max_attempts)"
        sleep $wait_seconds
    done
    
    # 保存回滚记录
    echo "$backup_path" > "$BACKUP_DIR/rolled_back_from"
    
    log_success "========================================"
    log_success "回滚完成!"
    log_success "回滚到版本: $(basename $backup_path)"
    log_success "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    log_success "========================================"
    
    # 显示状态
    pm2 list
}

# ============================================
# 撤销回滚
# ============================================

undo_rollback() {
    log_info "撤销回滚..."
    
    local rolled_back_from=$(cat "$BACKUP_DIR/rolled_back_from" 2>/dev/null)
    
    if [ -z "$rolled_back_from" ]; then
        log_error "没有找到回滚记录，无法撤销"
        exit 1
    fi
    
    local rollback_time=$(cat "$BACKUP_DIR/rollback_time" 2>/dev/null)
    local current_backup="$BACKUP_DIR/current_before_rollback_$rollback_time"
    
    if [ ! -d "$current_backup" ]; then
        log_error "没有找到回滚前的备份"
        exit 1
    fi
    
    log_warn "将恢复到回滚前的状态"
    read -p "确认撤销? [y/N]: " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "取消操作"
        exit 0
    fi
    
    # 停止服务
    pm2 stop "$PM2_NAME" || true
    
    # 恢复代码
    rm -rf "$APP_DIR/backend/dist"
    cp -r "$current_backup/dist" "$APP_DIR/backend/"
    
    # 重启服务
    pm2 start ecosystem.config.js --env production
    
    # 清理记录
    rm -f "$BACKUP_DIR/rolled_back_from"
    rm -f "$BACKUP_DIR/rollback_time"
    
    log_success "撤销回滚完成"
}

# ============================================
# 主流程
# ============================================

case "${1:-}" in
    list)
        list_backups
        ;;
    undo)
        undo_rollback
        ;;
    help|--help|-h)
        echo "用法: $0 [命令] [版本]"
        echo ""
        echo "命令:"
        echo "  list          列出可用备份"
        echo "  undo          撤销上一次回滚"
        echo "  [版本号]      回滚到指定版本"
        echo "  (无参数)      回滚到上一个版本"
        echo ""
        echo "示例:"
        echo "  $0                    # 回滚到上一个版本"
        echo "  $0 20240115_120000    # 回滚到指定版本"
        echo "  $0 list               # 列出所有备份"
        echo "  $0 undo               # 撤销回滚"
        ;;
    *)
        perform_rollback "$1"
        ;;
esac
