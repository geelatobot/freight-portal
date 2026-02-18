# 内部系统数据推送接口设计文档

> 设计时间: 2026-02-18  
> 用途: 内部系统推送集装箱数据，触发4portun订阅

---

## 一、数据表设计

### 1.1 内部推送记录表 (InternalPushRecord)

```prisma
model InternalPushRecord {
  id            String   @id @default(uuid())
  pushType      String   // 推送类型: CONTAINER_SYNC, ORDER_SYNC, etc.
  sourceSystem  String   // 来源系统标识: ERP, WMS, TMS, etc.
  payload       Json     // 推送的原始数据
  status        String   // 状态: PENDING, PROCESSING, SUCCESS, FAILED
  errorMessage  String?  // 错误信息
  processedAt   DateTime? // 处理时间
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // 关联的货物/订单
  shipments     Shipment[]
  
  @@index([status, createdAt])
  @@index([sourceSystem, pushType])
  @@map("internal_push_records")
}
```

### 1.2 集装箱订阅管理表 (ContainerSubscription)

```prisma
model ContainerSubscription {
  id              String    @id @default(uuid())
  containerNo     String    @unique
  blNo            String?   // 提单号
  bookingNo       String?   // 订舱号
  companyId       String    // 所属企业
  
  // 订阅状态
  status          String    // ACTIVE, PAUSED, EXPIRED
  subscribedAt    DateTime  @default(now())
  expiresAt       DateTime? // 订阅过期时间
  
  // 4portun 订阅状态
  fourportunSubId String?   // 4portun 订阅ID
  lastSyncAt      DateTime? // 最后同步时间
  nextSyncAt      DateTime? // 下次同步时间
  
  // 关联
  shipment        Shipment? @relation(fields: [shipmentId], references: [id])
  shipmentId      String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([containerNo])
  @@index([companyId, status])
  @@index([status, nextSyncAt])
  @@map("container_subscriptions")
}
```

### 1.3 更新 Shipment 表

```prisma
model Shipment {
  // ... 现有字段 ...
  
  // 订阅关联
  subscriptions   ContainerSubscription[]
  
  // 内部推送关联
  pushRecordId    String?
  pushRecord      InternalPushRecord? @relation(fields: [pushRecordId], references: [id])
}
```

---

## 二、API 接口设计

### 2.1 内部系统推送接口

**POST /api/v1/internal/push/containers**

用途: 内部系统推送集装箱数据，系统自动创建/更新订阅

**请求头:**
```http
X-Internal-Source: ERP        // 来源系统标识
X-Internal-Token: xxx        // 内部系统认证令牌
Content-Type: application/json
```

**请求体:**
```json
{
  "pushId": "ERP-20240218-001",     // 内部系统推送批次ID（用于幂等）
  "containers": [
    {
      "containerNo": "MSCU1234567",   // 集装箱号（必填）
      "blNo": "BL123456789",          // 提单号（可选）
      "bookingNo": "BK987654321",     // 订舱号（可选）
      "companyId": "company-xxx",     // 企业ID（必填）
      "carrierCode": "MSC",           // 船司代码（可选）
      "originPort": "CNSHA",          // 起运港（可选）
      "destinationPort": "USLAX",     // 目的港（可选）
      "etd": "2024-02-20T10:00:00Z",  // 预计开船时间（可选）
      "eta": "2024-03-05T14:00:00Z",  // 预计到港时间（可选）
      "subscribe": true,              // 是否订阅（默认true）
      "metadata": {                   // 附加数据（可选）
        "orderNo": "ORD2024001",
        "customerCode": "CUST001"
      }
    }
  ],
  "options": {
    "autoSubscribe": true,            // 自动订阅（默认true）
    "syncImmediately": true,          // 立即同步（默认true）
    "subscriptionDays": 90            // 订阅有效期（天，默认90）
  }
}
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pushRecordId": "uuid",
    "processed": 10,                  // 处理成功的数量
    "failed": 0,                      // 处理失败的数量
    "skipped": 0,                     // 跳过（重复）的数量
    "details": [
      {
        "containerNo": "MSCU1234567",
        "status": "SUCCESS",          // SUCCESS, FAILED, SKIPPED
        "shipmentId": "uuid",
        "subscriptionId": "uuid",
        "fourportunSubscribed": true, // 是否成功订阅4portun
        "message": "处理成功"
      }
    ]
  }
}
```

### 2.2 批量更新订阅状态

**PUT /api/v1/internal/subscriptions/batch**

用途: 内部系统批量更新订阅状态

**请求体:**
```json
{
  "containerNos": ["MSCU1234567", "MSCU7654321"],
  "action": "PAUSE",  // PAUSE, RESUME, CANCEL, EXTEND
  "params": {
    "extendDays": 30   // 延期天数（action=EXTEND时）
  }
}
```

### 2.3 查询订阅状态

**GET /api/v1/internal/subscriptions**

用途: 内部系统查询集装箱订阅状态

**查询参数:**
```
containerNos: MSCU1234567,MSCU7654321  // 集装箱号列表（逗号分隔）
companyId: company-xxx                  // 企业ID
status: ACTIVE                          // 订阅状态
```

**响应:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "containerNo": "MSCU1234567",
        "status": "ACTIVE",
        "companyId": "company-xxx",
        "subscribedAt": "2024-02-18T10:00:00Z",
        "expiresAt": "2024-05-18T10:00:00Z",
        "lastSyncAt": "2024-02-18T12:00:00Z",
        "shipmentStatus": "IN_TRANSIT",
        "currentNode": "DEPARTURE"
      }
    ]
  }
}
```

### 2.4 推送记录查询

**GET /api/v1/internal/push-records**

用途: 查询内部系统推送记录和处理状态

**查询参数:**
```
sourceSystem: ERP
pushType: CONTAINER_SYNC
status: SUCCESS
startDate: 2024-02-01
endDate: 2024-02-18
```

---

## 三、处理流程

### 3.1 集装箱数据推送处理流程

```
内部系统推送集装箱数据
    ↓
接收 POST /internal/push/containers
    ↓
验证请求（认证、参数校验）
    ↓
创建 InternalPushRecord（幂等控制）
    ↓
遍历集装箱列表处理:
    ├─ 检查集装箱是否已存在
    ├─ 创建/更新 Shipment 记录
    ├─ 创建/更新 ContainerSubscription
    ├─ 调用 4portun API 订阅（如需要）
    └─ 立即同步一次数据（如需要）
    ↓
更新 InternalPushRecord 状态
    ↓
返回处理结果
```

### 3.2 4portun 订阅管理流程

```
ContainerSubscription 状态: ACTIVE
    ↓
定时任务检查（每分钟）
    ↓
筛选 nextSyncAt <= now() 的订阅
    ↓
调用 4portun.trackContainer() 同步数据
    ↓
更新 Shipment 和 ShipmentNode
    ↓
更新 lastSyncAt 和 nextSyncAt
    ↓
如订阅即将过期，发送提醒
```

---

## 四、安全设计

### 4.1 认证机制

**内部系统认证:**
- 使用 `X-Internal-Token` 请求头
- Token 在环境变量 `INTERNAL_API_TOKEN` 中配置
- 支持 IP 白名单限制

### 4.2 幂等控制

- 使用 `pushId` 确保同一批次数据只处理一次
- 数据库唯一索引防止重复订阅

### 4.3 限流保护

- 每分钟最多 1000 次推送
- 每批次最多 100 个集装箱

---

## 五、实现文件清单

### 5.1 后端实现

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | 更新数据库模型 |
| `src/modules/internal/internal.module.ts` | 内部系统模块 |
| `src/modules/internal/internal.controller.ts` | 推送接口控制器 |
| `src/modules/internal/internal.service.ts` | 推送处理服务 |
| `src/modules/internal/dto/push-containers.dto.ts` | 推送 DTO |
| `src/modules/sync/services/subscription.service.ts` | 订阅管理服务 |

### 5.2 数据库迁移

```bash
npx prisma migrate dev --name add_internal_push_and_subscription
```

---

## 六、使用示例

### 6.1 内部系统调用示例

```bash
curl -X POST https://api.yourdomain.com/api/v1/internal/push/containers \
  -H "Content-Type: application/json" \
  -H "X-Internal-Source: ERP" \
  -H "X-Internal-Token: your-internal-token" \
  -d '{
    "pushId": "ERP-20240218-001",
    "containers": [
      {
        "containerNo": "MSCU1234567",
        "blNo": "BL123456789",
        "companyId": "company-xxx",
        "subscribe": true
      }
    ]
  }'
```

---

## 七、后续扩展

1. **消息队列** - 大量数据时使用 RabbitMQ/Kafka
2. **异步处理** - 支持 WebSocket 实时通知内部系统
3. **数据对账** - 定期与内部系统核对数据一致性
