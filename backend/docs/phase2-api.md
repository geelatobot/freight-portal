# 第二阶段核心业务功能 API 文档

## 任务 2.1.1: 订单生命周期管理

### 订单状态机

订单状态流转规则：
- `PENDING` → `CONFIRMED` → `PROCESSING` → `COMPLETED`
- `PENDING` → `CANCELLED` (可取消)
- `PENDING` → `REJECTED` (可拒绝)
- `CONFIRMED` → `CANCELLED` (可取消)

### API 接口

#### 1. 获取订单状态变更历史
```
GET /orders/:orderId/lifecycle/history
```

#### 2. 获取可用的状态流转选项
```
GET /orders/:orderId/lifecycle/transitions
```

#### 3. 企业管理员审批订单
```
POST /orders/:orderId/lifecycle/approve
Content-Type: application/json

{
  "approved": true,      // true: 通过, false: 拒绝
  "reason": "",          // 拒绝原因（拒绝时必填）
  "remark": ""           // 备注
}
```

#### 4. 执行状态流转
```
POST /orders/:orderId/lifecycle/transition
Content-Type: application/json

{
  "status": "CONFIRMED",  // 目标状态
  "reason": "",           // 原因
  "remark": ""            // 备注
}
```

#### 5. 关联货物（集装箱）
```
POST /orders/:orderId/lifecycle/link-shipments
Content-Type: application/json

{
  "shipmentIds": ["shipment-1", "shipment-2"]
}
```

#### 6. 根据集装箱号自动关联
```
POST /orders/:orderId/lifecycle/auto-link
Content-Type: application/json

{
  "containerNos": ["MSKU1234567", "MSKU7654321"]
}
```

#### 7. 解除货物关联
```
POST /orders/:orderId/lifecycle/unlink-shipments
Content-Type: application/json

{
  "shipmentIds": ["shipment-1"]
}
```

#### 8. 批量确认订单
```
POST /orders/lifecycle/batch-confirm
Content-Type: application/json

{
  "orderIds": ["order-1", "order-2"],
  "remark": "批量确认"
}
```

#### 9. 获取所有状态定义
```
GET /order-state-machine/statuses
```

#### 10. 获取所有状态流转规则
```
GET /order-state-machine/transitions
```

---

## 任务 2.2.1: 账单管理核心功能

### 账单状态流转

账单状态流转规则：
- `DRAFT` → `ISSUED` → `PARTIAL_PAID` → `PAID`
- `DRAFT` → `CANCELLED`
- `ISSUED` → `OVERDUE`

### API 接口

#### 1. 基于订单生成账单
```
POST /bills/generate-from-order
Content-Type: application/json

{
  "orderId": "order-1",
  "companyId": "company-1",
  "billType": "FREIGHT",
  "dueDays": 30,
  "remark": "",
  "items": [
    {
      "itemCode": "FREIGHT",
      "itemName": "运费",
      "quantity": 1,
      "unit": "票",
      "unitPrice": 1000,
      "currency": "CNY",
      "remark": ""
    }
  ]
}
```

#### 2. 基于货物生成账单
```
POST /bills/generate-from-shipment
Content-Type: application/json

{
  "shipmentId": "shipment-1",
  "companyId": "company-1",
  "billType": "FREIGHT",
  "dueDays": 30,
  "remark": "",
  "items": [...]
}
```

#### 3. 账单状态流转
```
POST /bills/:id/transition
Content-Type: application/json

{
  "status": "ISSUED",
  "reason": ""
}
```

#### 4. 开具账单
```
POST /bills/:id/issue
Content-Type: application/json

{
  "reason": ""
}
```

#### 5. 取消账单
```
POST /bills/:id/cancel
Content-Type: application/json

{
  "reason": "取消原因"
}
```

#### 6. 确认收款
```
POST /bills/:id/payment
Content-Type: application/json

{
  "paidAmount": 500,
  "remark": "部分收款"
}
```

#### 7. 获取账单状态历史
```
GET /bills/:id/history
```

#### 8. 添加账单明细
```
POST /bills/:id/items
Content-Type: application/json

{
  "itemCode": "CUSTOMS",
  "itemName": "报关费",
  "quantity": 1,
  "unit": "票",
  "unitPrice": 200,
  "remark": ""
}
```

#### 9. 更新账单明细
```
PUT /bills/:id/items/:itemId
Content-Type: application/json

{
  "itemCode": "CUSTOMS",
  "itemName": "报关费",
  "quantity": 1,
  "unit": "票",
  "unitPrice": 250,
  "remark": ""
}
```

#### 10. 删除账单明细
```
DELETE /bills/:id/items/:itemId
```

#### 11. 批量更新账单明细
```
PUT /bills/:id/items
Content-Type: application/json

{
  "items": [
    {
      "itemCode": "FREIGHT",
      "itemName": "运费",
      "quantity": 1,
      "unit": "票",
      "unitPrice": 1000
    },
    {
      "itemCode": "CUSTOMS",
      "itemName": "报关费",
      "quantity": 1,
      "unit": "票",
      "unitPrice": 200
    }
  ]
}
```

#### 12. 获取账单状态定义
```
GET /bills/metadata/statuses
```

#### 13. 获取账单类型定义
```
GET /bills/metadata/types
```

---

## 任务 2.3.1: 企业认证流程

### 企业状态

- `PENDING`: 待审核
- `ACTIVE`: 正常
- `SUSPENDED`: 暂停
- `REJECTED`: 已拒绝

### API 接口

#### 1. 提交企业认证信息
```
POST /company-verification/submit
Content-Type: application/json

{
  "companyName": "测试企业",
  "creditCode": "91110000XXXXXXXXXX",
  "address": "北京市朝阳区xxx",
  "contactName": "张三",
  "contactPhone": "13800138000",
  "contactEmail": "test@example.com",
  "businessLicenseUrl": "https://example.com/license.pdf",
  "remark": ""
}
```

#### 2. 上传营业执照
```
POST /company-verification/upload-license
Content-Type: application/json

{
  "companyId": "company-1",
  "fileUrl": "https://example.com/license.pdf",
  "fileName": "营业执照.pdf"
}
```

#### 3. 获取当前企业的认证状态
```
GET /company-verification/status
```

#### 4. 获取指定企业认证状态
```
GET /company-verification/:companyId/status
```

#### 5. 重新提交认证
```
POST /company-verification/:companyId/resubmit
Content-Type: application/json

{
  "companyName": "测试企业",
  "creditCode": "91110000XXXXXXXXXX",
  ...
}
```

#### 6. 获取审核历史
```
GET /company-verification/:companyId/history
```

### 管理后台接口

#### 7. 获取待审核企业列表
```
GET /admin/company-verification/pending?page=1&pageSize=20
```

#### 8. 审核企业
```
POST /admin/company-verification/:companyId/review
Content-Type: application/json

{
  "approved": true,       // true: 通过, false: 拒绝
  "reason": "",           // 拒绝原因
  "creditLimit": 100000   // 授信额度（可选）
}
```

#### 9. 获取所有企业列表
```
GET /admin/company-verification/companies?status=PENDING&keyword=测试&page=1&pageSize=20
```

#### 10. 获取企业详情
```
GET /admin/company-verification/companies/:companyId
```

---

## 数据库表结构

### 订单状态变更历史表 (order_status_history)
```sql
CREATE TABLE order_status_history (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  reason TEXT,
  remark TEXT,
  operator_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 账单状态变更历史表 (bill_status_history)
```sql
CREATE TABLE bill_status_history (
  id VARCHAR(36) PRIMARY KEY,
  bill_id VARCHAR(36) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  reason TEXT,
  operator_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 企业认证信息表 (company_verifications)
```sql
CREATE TABLE company_verifications (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL UNIQUE,
  business_license_url VARCHAR(500),
  legal_person_name VARCHAR(100),
  legal_person_id_card VARCHAR(50),
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewer_id VARCHAR(36),
  review_remark TEXT,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
