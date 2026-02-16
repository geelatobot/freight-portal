# ERP系统对接方案

## 1. 对接概述

### 1.1 对接目标
实现客户自有ERP系统与货代客户门户的双向数据同步，确保数据一致性和业务流程贯通。

### 1.2 对接范围

| 数据类型 | 方向 | 说明 |
|---------|------|------|
| 客户主数据 | ERP → 门户 | 客户信息、联系人、信用额度 |
| 订单数据 | 双向 | 新订单创建、状态更新 |
| 货物状态 | ERP → 门户 | 货物跟踪节点更新 |
| 财务数据 | ERP → 门户 | 账单、发票、收款记录 |
| 库存数据 | ERP → 门户 | 可用舱位、运价 |
| 支付结果 | 门户 → ERP | 在线支付结果回传 |

### 1.3 对接方式

推荐采用**消息队列+API**的混合模式：
- 实时性要求高的：同步API调用
- 可异步处理的：消息队列
- 大数据量同步：批量文件+API

---

## 2. 接口设计

### 2.1 接口规范

```yaml
# 基础信息
base_url: https://erp-api.customer.com
protocol: HTTPS
format: JSON
encoding: UTF-8
auth: API Key + HMAC-SHA256签名

# 请求头
headers:
  Content-Type: application/json
  X-API-Key: {api_key}
  X-Timestamp: {timestamp}
  X-Signature: {hmac_signature}
  X-Request-ID: {uuid}
```

### 2.2 签名算法

```python
# Python示例
import hmac
import hashlib
import base64

def generate_signature(api_key, api_secret, timestamp, body):
    message = f"{api_key}{timestamp}{body}"
    signature = hmac.new(
        api_secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature
```

---

## 3. 接口清单

### 3.1 客户主数据同步

#### 3.1.1 获取客户列表
```
GET /api/v1/customers
```

**请求参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认50 |
| updateTimeFrom | string | 否 | 更新时间起始，ISO8601格式 |
| updateTimeTo | string | 否 | 更新时间截止 |

**响应示例：**
```json
{
  "code": 200,
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 50,
    "list": [
      {
        "customerId": "C20240001",
        "customerName": "某某贸易公司",
        "creditCode": "91330000XXXXXXXX",
        "address": "浙江省杭州市...",
        "contactName": "张三",
        "contactPhone": "13800138000",
        "contactEmail": "zhangsan@example.com",
        "creditLimit": 100000.00,
        "creditUsed": 35000.00,
        "status": "active",
        "createTime": "2024-01-15T10:30:00Z",
        "updateTime": "2024-06-20T14:20:00Z"
      }
    ]
  }
}
```

#### 3.1.2 客户变更推送（ERP主动推送）
```
POST /portal/api/v1/customers/sync
```

**请求体：**
```json
{
  "eventType": "CREATE|UPDATE|DISABLE",
  "customer": {
    "customerId": "C20240001",
    "customerName": "某某贸易公司",
    ...
  },
  "timestamp": "2024-06-20T14:20:00Z"
}
```

### 3.2 订单数据同步

#### 3.2.1 新订单同步（门户 → ERP）
```
POST /api/v1/orders
```

**请求体：**
```json
{
  "orderNo": "ORD2024001001",
  "customerId": "C20240001",
  "orderType": "FCL",
  "originPort": "SHANGHAI",
  "destinationPort": "LOS_ANGELES",
  "cargo": {
    "description": "电子产品",
    "weight": 15000,
    "volume": 25,
    "packageType": "CTNS",
    "packageCount": 500
  },
  "containers": [
    {
      "type": "20GP",
      "count": 2
    }
  ],
  "shipper": {
    "name": "发货人公司",
    "address": "...",
    "contact": "...",
    "phone": "..."
  },
  "consignee": {
    "name": "收货人公司",
    "address": "...",
    "contact": "...",
    "phone": "..."
  },
  "notifyParty": {
    "name": "通知方",
    ...
  },
  "remark": "特殊要求...",
  "createTime": "2024-06-20T10:00:00Z"
}
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "erpOrderNo": "ERP2024000567",
    "status": "CONFIRMED",
    "message": "订单创建成功"
  }
}
```

#### 3.2.2 订单状态更新（ERP → 门户）
```
POST /portal/api/v1/orders/{orderNo}/status
```

**请求体：**
```json
{
  "status": "CONFIRMED|REJECTED|PROCESSING|COMPLETED|CANCELLED",
  "subStatus": "AWAITING_SO|SO_CONFIRMED|...",
  "erpOrderNo": "ERP2024000567",
  "operator": "操作员姓名",
  "remark": "状态变更说明",
  "timestamp": "2024-06-20T11:30:00Z"
}
```

### 3.3 货物状态同步

#### 3.3.1 货物状态推送（ERP → 门户）
```
POST /portal/api/v1/shipments/{containerNo}/events
```

**请求体：**
```json
{
  "containerNo": "MSCU1234567",
  "blNo": "SHAXXXXXX",
  "events": [
    {
      "nodeCode": "GATE_IN",
      "nodeName": "重箱进港",
      "location": "上海港",
      "eventTime": "2024-06-21T08:30:00Z",
      "description": "集装箱已进港",
      "operator": "码头系统"
    }
  ],
  "timestamp": "2024-06-21T08:35:00Z"
}
```

**节点代码映射：**

| ERP节点代码 | 门户标准代码 | 节点名称 |
|------------|-------------|---------|
| BK_CONFIRM | BOOKING_CONFIRMED | 订舱确认 |
| SO_RELEASE | SO_RELEASED | 放舱 |
| EMPTY_PICK | EMPTY_PICKUP | 提空箱 |
| GATE_IN | GATE_IN | 重箱进港 |
| CUSTOMS_PASS | CUSTOMS_RELEASED | 海关放行 |
| TERMINAL_PASS | TERMINAL_RELEASED | 码头放行 |
| DEPARTURE | DEPARTURE | 船舶离港 |
| ARRIVAL | ARRIVAL | 船舶抵港 |
| DISCHARGE | DISCHARGED | 卸船 |
| FULL_PICK | FULL_PICKUP | 提重箱 |
| EMPTY_RETURN | EMPTY_RETURN | 还空箱 |

### 3.4 财务数据同步

#### 3.4.1 账单推送（ERP → 门户）
```
POST /portal/api/v1/bills
```

**请求体：**
```json
{
  "billNo": "BILL2024001001",
  "customerId": "C20240001",
  "orderNo": "ORD2024001001",
  "billType": "FREIGHT",
  "currency": "CNY",
  "amount": 15800.00,
  "items": [
    {
      "itemCode": "OCEAN_FREIGHT",
      "itemName": "海运费",
      "quantity": 2,
      "unit": "UNIT",
      "unitPrice": 5000.00,
      "amount": 10000.00
    },
    {
      "itemCode": "THC",
      "itemName": "码头操作费",
      "quantity": 2,
      "unit": "UNIT",
      "unitPrice": 800.00,
      "amount": 1600.00
    }
  ],
  "issueDate": "2024-06-25",
  "dueDate": "2024-07-25",
  "status": "ISSUED",
  "remark": "..."
}
```

#### 3.4.2 支付结果回传（门户 → ERP）
```
POST /api/v1/bills/{billNo}/payment
```

**请求体：**
```json
{
  "paymentNo": "PAY2024000567",
  "paymentMethod": "WECHAT_PAY|ALIPAY|BANK_TRANSFER",
  "amount": 15800.00,
  "transactionId": "wx_123456789",
  "paidAt": "2024-06-26T10:30:00Z",
  "payer": "付款人姓名",
  "receiptUrl": "https://.../receipt.pdf"
}
```

### 3.5 库存/运价数据

#### 3.5.1 可用舱位查询
```
GET /api/v1/inventory/spaces
```

**请求参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| originPort | string | 是 | 起运港代码 |
| destinationPort | string | 是 | 目的港代码 |
| etdFrom | string | 是 | 预计开船起始 |
| etdTo | string | 是 | 预计开船截止 |
| containerType | string | 否 | 箱型 |

**响应示例：**
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "routeId": "R001",
        "carrier": "COSCO",
        "vessel": "COSCO SHANGHAI",
        "voyage": "V.2406E",
        "originPort": "SHANGHAI",
        "destinationPort": "LOS_ANGELES",
        "etd": "2024-07-01T08:00:00Z",
        "eta": "2024-07-15T18:00:00Z",
        "availableSpaces": {
          "20GP": 15,
          "40GP": 8,
          "40HQ": 12
        },
        "prices": {
          "20GP": 2800,
          "40GP": 3600,
          "40HQ": 3800
        },
        "currency": "USD"
      }
    ]
  }
}
```

---

## 4. 消息队列设计

### 4.1 队列划分

| 队列名称 | 用途 | 优先级 |
|---------|------|--------|
| erp.customer.sync | 客户数据同步 | 高 |
| erp.order.sync | 订单数据同步 | 高 |
| erp.shipment.sync | 货物状态同步 | 高 |
| erp.billing.sync | 财务数据同步 | 中 |
| erp.inventory.sync | 库存数据同步 | 低 |
| portal.order.create | 门户订单创建 | 高 |
| portal.payment.result | 支付结果回传 | 高 |

### 4.2 消息格式

```json
{
  "messageId": "msg_xxx",
  "timestamp": "2024-06-20T14:20:00Z",
  "eventType": "CUSTOMER_CREATE|ORDER_UPDATE|SHIPMENT_EVENT",
  "payload": {},
  "retryCount": 0,
  "maxRetries": 3
}
```

---

## 5. 数据映射表

### 5.1 港口代码映射

| 标准代码 | 名称 | ERP代码 |
|---------|------|---------|
| CNSHA | 上海 | SHA |
| CNNGB | 宁波 | NGB |
| CNSZX | 深圳 | SZX |
| USLAX | 洛杉矶 | LAX |
| USNYC | 纽约 | NYC |
| DEHAM | 汉堡 | HAM |
| NLRTM | 鹿特丹 | RTM |

### 5.2 币种代码映射

| 标准代码 | 名称 | ERP代码 |
|---------|------|---------|
| CNY | 人民币 | RMB |
| USD | 美元 | USD |
| EUR | 欧元 | EUR |
| GBP | 英镑 | GBP |

### 5.3 订单状态映射

| 门户状态 | ERP状态 | 说明 |
|---------|---------|------|
| PENDING | 待确认 | 待ERP确认 |
| CONFIRMED | 已确认 | ERP已确认 |
| REJECTED | 已拒绝 | ERP拒绝 |
| PROCESSING | 执行中 | 订单执行中 |
| COMPLETED | 已完成 | 订单完成 |
| CANCELLED | 已取消 | 订单取消 |

---

## 6. 异常处理

### 6.1 重试策略

| 错误类型 | 重试次数 | 重试间隔 | 处理方式 |
|---------|---------|---------|---------|
| 网络超时 | 3次 | 5s, 10s, 30s | 告警+人工介入 |
| 数据校验失败 | 0次 | - | 记录日志+人工处理 |
| ERP系统繁忙 | 5次 | 1min递增 | 延迟重试 |
| 认证失败 | 0次 | - | 立即告警 |

### 6.2 补偿机制

```
┌──────────┐    失败    ┌──────────┐
│ 同步任务  │──────────▶│ 死信队列  │
└──────────┘           └────┬─────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌─────────┐   ┌─────────┐   ┌─────────┐
        │人工处理  │   │定时重试  │   │数据核对  │
        └─────────┘   └─────────┘   └─────────┘
```

---

## 7. 监控与日志

### 7.1 监控指标

| 指标 | 阈值 | 告警级别 |
|------|------|---------|
| 接口成功率 | < 99% | 警告 |
| 接口响应时间 | > 2s | 警告 |
| 消息堆积数 | > 1000 | 严重 |
| 同步延迟 | > 5min | 警告 |

### 7.2 日志规范

```json
{
  "timestamp": "2024-06-20T14:20:00Z",
  "level": "INFO|WARN|ERROR",
  "module": "erp-sync",
  "action": "order_create",
  "requestId": "req_xxx",
  "customerId": "C20240001",
  "orderNo": "ORD2024001001",
  "duration": 150,
  "status": "success|failed",
  "error": "..."
}
```

---

## 8. 待确认事项

- [ ] ERP系统接口文档（详细接口定义）
- [ ] ERP系统开发/测试环境访问权限
- [ ] 数据映射表确认（港口代码、币种代码等）
- [ ] 同步频率要求（实时/分钟级/小时级）
- [ ] 历史数据迁移方案
- [ ] 回滚/降级方案
