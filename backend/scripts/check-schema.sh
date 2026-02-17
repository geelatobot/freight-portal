#!/bin/bash
#
# Prisma Schema 修复脚本
# 用于修复重复模型定义问题
#

set -e

SCHEMA_FILE="${1:-prisma/schema.prisma}"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: Schema file not found: $SCHEMA_FILE"
    exit 1
fi

echo "Checking schema file: $SCHEMA_FILE"
echo ""

# 检查重复模型
models=("Shipment" "Order" "Bill" "User" "Company" "Customer" "ShipmentNode" "Document" "BillItem" "Invoice" "Payment" "AuditLog" "ApiLog" "SystemConfig" "Notification" "RefreshToken")

has_duplicate=false

for model in "${models[@]}"; do
    count=$(grep -c "^model $model {" "$SCHEMA_FILE" 2>/dev/null || echo 0)
    if [ "$count" -gt 1 ]; then
        echo "❌ ERROR: Model '$model' is defined $count times"
        grep -n "^model $model {" "$SCHEMA_FILE"
        has_duplicate=true
    elif [ "$count" -eq 1 ]; then
        echo "✅ OK: Model '$model' is defined once"
    fi
done

echo ""

if [ "$has_duplicate" = true ]; then
    echo "Found duplicate model definitions!"
    echo ""
    echo "To fix this issue:"
    echo "1. Open the schema file: $SCHEMA_FILE"
    echo "2. Remove duplicate model definitions (usually at the end of file)"
    echo "3. Keep only the original model definitions with their fields"
    echo ""
    echo "Or restore from git:"
    echo "  git checkout prisma/schema.prisma"
    exit 1
else
    echo "✅ Schema file is clean - no duplicate models found"
    exit 0
fi
