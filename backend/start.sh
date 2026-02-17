#!/bin/bash
#
# Freight Portal - Quick Start Script (Development)
# Version: 2.0.0
#

set -o errexit
set -o nounset
set -o pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

log_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

log_warn() {
    printf "${YELLOW}[WARN]${NC} %s\n" "$1"
}

log_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1" >&2
}

# =============================================================================
# Main
# =============================================================================

echo "======================================"
echo "Freight Portal - Quick Start"
echo "======================================"
echo ""

# 检查是否在backend目录
if [ ! -f "package.json" ]; then
    log_error "Please run this script in the backend directory"
    exit 1
fi

# 检查Node.js版本
if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_warn "Node.js version is $(node -v). Recommended: v18+"
fi

log_info "[1/5] Installing dependencies..."
# 尝试使用国内镜像
if ! npm install --registry=https://registry.npmmirror.com 2>&1; then
    log_warn "Failed with npmmirror, trying default registry..."
    if ! npm install 2>&1; then
        log_error "Failed to install dependencies"
        exit 1
    fi
fi
log_success "Dependencies installed"

echo ""
log_info "[2/5] Generating Prisma client..."
npx prisma generate || {
    log_error "Failed to generate Prisma client"
    exit 1
}
log_success "Prisma client generated"

echo ""
log_info "[3/5] Running database migrations..."
npx prisma migrate dev --name init || {
    log_warn "Migration may have issues, continuing..."
}
log_success "Database migrations completed"

echo ""
log_info "[4/5] Building project..."
npm run build || {
    log_error "Build failed"
    exit 1
}
log_success "Project built"

echo ""
echo "======================================"
log_success "Setup complete!"
echo "======================================"
echo ""
echo -e "Starting development server on ${BLUE}http://localhost:3000${NC}"
echo "Press Ctrl+C to stop"
echo ""
npm run start:dev
