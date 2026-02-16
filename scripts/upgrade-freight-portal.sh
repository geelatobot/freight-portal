#!/bin/bash

# =============================================================================
# 货代客户门户 - 自动升级脚本
# 自动备份、升级、回滚
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/opt/freight-portal"
CONFIG_DIR="$PROJECT_DIR/shared"
RELEASES_DIR="$PROJECT_DIR/releases"
CURRENT_LINK="$PROJECT_DIR/current"
MAX_RELEASES=5  # 保留最近5个版本

# 生成版本号
VERSION=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="$RELEASES_DIR/$VERSION"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}货代客户门户 - 自动升级${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 获取当前版本
CURRENT_VERSION=$(basename $(readlink -f "$CURRENT_LINK" 2>/dev/null) 2>/dev/null || echo "none")
echo -e "当前版本: ${YELLOW}$CURRENT_VERSION${NC}"
echo -e "新版本: ${YELLOW}$VERSION${NC}"
echo ""

# =============================================================================
# 步骤1: 备份当前版本
# =============================================================================
echo -e "${YELLOW}[1/7] 备份当前版本...${NC}"
if [ "$CURRENT_VERSION" != "none" ]; then
    echo "$CURRENT_VERSION" > "$PROJECT_DIR/.previous_version"
    echo -e "${GREEN}✓ 已记录当前版本: $CURRENT_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ 未找到当前版本，跳过备份${NC}"
fi

# =============================================================================
# 步骤2: 数据库备份
# =============================================================================
echo ""
echo -e "${YELLOW}[2/7] 数据库备份...${NC}"
source $CONFIG_DIR/.env
BACKUP_FILE="$CONFIG_DIR/backup/db-$VERSION.sql"
mkdir -p "$CONFIG_DIR/backup"

# 尝试备份（如果mysqldump可用）
if command -v mysqldump >/dev/null 2>&1; then
    mysqldump --no-table-space -h "$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')" \
        -u "$(echo $DATABASE_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')" \
        -p"$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')" \
        "$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\)?.*/\1/')" > "$BACKUP_FILE" 2>/dev/null && \
        echo -e "${GREEN}✓ 数据库备份完成: $BACKUP_FILE${NC}" || \
        echo -e "${YELLOW}⚠ 数据库备份跳过（可能需要手动配置）${NC}"
else
    echo -e "${YELLOW}⚠ mysqldump未安装，跳过数据库备份${NC}"
fi

# =============================================================================
# 步骤3: 下载新版本代码
# =============================================================================
echo ""
echo -e "${YELLOW}[3/7] 下载新版本代码...${NC}"
mkdir -p "$RELEASE_DIR"
git clone --depth 1 https://github.com/geelatobot/freight-portal.git "$RELEASE_DIR/source"
echo -e "${GREEN}✓ 代码下载完成${NC}"

# =============================================================================
# 步骤4: 安装依赖
# =============================================================================
echo ""
echo -e "${YELLOW}[4/7] 安装依赖...${NC}"
cd "$RELEASE_DIR/source/backend"
npm install --production --silent
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# =============================================================================
# 步骤5: 配置环境
# =============================================================================
echo ""
echo -e "${YELLOW}[5/7] 配置环境...${NC}"
cp "$CONFIG_DIR/.env" .
ln -sf "$CONFIG_DIR/logs" logs 2>/dev/null || mkdir -p logs
ln -sf "$CONFIG_DIR/uploads" uploads 2>/dev/null || mkdir -p uploads
echo -e "${GREEN}✓ 环境配置完成${NC}"

# =============================================================================
# 步骤6: 数据库迁移
# =============================================================================
echo ""
echo -e "${YELLOW}[6/7] 数据库迁移...${NC}"
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}✓ 数据库迁移完成${NC}"

# =============================================================================
# 步骤7: 构建并切换版本
# =============================================================================
echo ""
echo -e "${YELLOW}[7/7] 构建应用...${NC}"
npm run build
echo -e "${GREEN}✓ 应用构建完成${NC}"

# 切换版本
echo ""
echo -e "${YELLOW}切换版本...${NC}"
ln -sfn "$RELEASE_DIR/source/backend" "$CURRENT_LINK"

# 平滑重启
cd "$CURRENT_LINK"
pm2 reload freight-portal

# =============================================================================
# 健康检查
# =============================================================================
echo ""
echo -e "${YELLOW}健康检查...${NC}"
sleep 3

for i in 1 2 3; do
    if curl -sf http://localhost:3000/api/v1/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务运行正常${NC}"
        
        # 清理旧版本
        echo ""
        echo -e "${YELLOW}清理旧版本...${NC}"
        cd "$RELEASES_DIR"
        ls -t | tail -n +$((MAX_RELEASES + 1)) | xargs -r rm -rf 2>/dev/null || true
        
        # 完成
        echo ""
        echo -e "${GREEN}======================================${NC}"
        echo -e "${GREEN}✅ 升级成功！${NC}"
        echo -e "${GREEN}======================================${NC}"
        echo ""
        echo -e "新版本: ${YELLOW}$VERSION${NC}"
        echo -e "旧版本: ${YELLOW}$CURRENT_VERSION${NC}（保留，可回滚）"
        echo ""
        echo -e "访问地址: ${YELLOW}http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')/api/v1/health${NC}"
        echo ""
        exit 0
    fi
    sleep 2
done

# 健康检查失败，执行回滚
echo -e "${RED}✗ 健康检查失败，执行回滚...${NC}"
$PROJECT_DIR/scripts/rollback.sh
exit 1
