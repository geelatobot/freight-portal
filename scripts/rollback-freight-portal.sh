#!/bin/bash

# =============================================================================
# 货代客户门户 - 回滚脚本
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/opt/freight-portal"
RELEASES_DIR="$PROJECT_DIR/releases"
CURRENT_LINK="$PROJECT_DIR/current"
PREVIOUS_VERSION_FILE="$PROJECT_DIR/.previous_version"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}货代客户门户 - 版本回滚${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 获取当前版本
CURRENT_VERSION=$(basename $(readlink -f "$CURRENT_LINK" 2>/dev/null) 2>/dev/null || echo "none")

# 获取上一个版本
if [ -f "$PREVIOUS_VERSION_FILE" ]; then
    PREVIOUS_VERSION=$(cat "$PREVIOUS_VERSION_FILE")
else
    echo -e "${RED}✗ 未找到上一个版本记录，无法回滚${NC}"
    echo -e "${YELLOW}提示: 升级脚本会自动记录版本信息${NC}"
    exit 1
fi

echo -e "当前版本: ${YELLOW}$CURRENT_VERSION${NC}"
echo -e "回滚到: ${YELLOW}$PREVIOUS_VERSION${NC}"
echo ""

# 检查版本目录是否存在
if [ ! -d "$RELEASES_DIR/$PREVIOUS_VERSION" ]; then
    echo -e "${RED}✗ 上一个版本目录不存在: $PREVIOUS_VERSION${NC}"
    echo -e "${YELLOW}可用版本:${NC}"
    ls -lt "$RELEASES_DIR" | tail -n +2 | head -5
    exit 1
fi

# 执行回滚
echo -e "${YELLOW}执行回滚...${NC}"
ln -sfn "$RELEASES_DIR/$PREVIOUS_VERSION/source/backend" "$CURRENT_LINK"

cd "$CURRENT_LINK"
pm2 reload freight-portal

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ 回滚完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "当前版本: ${YELLOW}$PREVIOUS_VERSION${NC}"
echo ""
echo -e "访问地址: ${YELLOW}http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')/api/v1/health${NC}"
echo ""
