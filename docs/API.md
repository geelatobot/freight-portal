# 货代客户门户 API 文档

## 基础信息

- **Base URL**: `https://api.yourdomain.com/api/v1`
- **认证方式**: Bearer Token
- **Content-Type**: `application/json`

## 认证接口

### 登录
```http
POST /auth/login
```

**请求体**:
```json
{
  "username": "用户名/邮箱/手机号",
  "password": "密码"
}
```

**响应**:
```json
{
  "user": { ... },
  "companies": [ ... ],
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

### 注册
```http
POST /auth/register
```

**请求体**:
```json
{
  "username": "用户名",
  "password": "密码",
  "email": "邮箱",
  "phone": "手机号",
  "companyName": "企业名称",
  "realName": "真实姓名"
}
```

### 刷新Token
```http
POST /auth/refresh
```

**请求体**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## 客户接口

### 获取用户信息
```http
GET /customers/profile
Authorization: Bearer {token}
```

### 获取企业列表
```http
GET /customers/companies
Authorization: Bearer {token}
```

## 货物查询接口

### 查询集装箱（公开）
```http
POST /shipments/track
```

**请求体**:
```json
{
  "containerNo": "MSCU1234567"
}
```

### 提单查询（公开）
```http
GET /shipments/track/bl?blNo=SHAXXXXXX
```

### 获取企业货物列表
```http
GET /shipments?page=1&pageSize=20&status=DEPARTURE
Authorization: Bearer {token}
```

### 获取货物详情
```http
GET /shipments/{id}
Authorization: Bearer {token}
```

## 订单接口

### 创建订单
```http
POST /orders
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "type": "FCL",
  "originPort": "CNSHA",
  "destinationPort": "USLAX",
  "cargoDesc": "电子产品",
  "cargoWeight": 15000,
  "containerType": "20GP",
  "containerCount": 2,
  "shipperName": "发货人",
  "consigneeName": "收货人"
}
```

### 获取订单列表
```http
GET /orders?page=1&pageSize=20&status=PENDING
Authorization: Bearer {token}
```

### 获取订单详情
```http
GET /orders/{id}
Authorization: Bearer {token}
```

### 更新订单
```http
PUT /orders/{id}
Authorization: Bearer {token}
```

### 取消订单
```http
DELETE /orders/{id}
Authorization: Bearer {token}
```

## 财务接口

### 获取账单列表
```http
GET /billing/bills?page=1&pageSize=20&status=ISSUED
Authorization: Bearer {token}
```

### 获取账单详情
```http
GET /billing/bills/{id}
Authorization: Bearer {token}
```

### 获取财务统计
```http
GET /billing/stats
Authorization: Bearer {token}
```

## AI接口

### 智能客服对话
```http
POST /ai/chat
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "message": "我的货到哪里了？"
}
```

**响应**:
```json
{
  "reply": "根据查询，您的集装箱...",
  "sessionId": "sess_xxx"
}
```

### 查询货物状态
```http
POST /ai/query-shipment
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "containerNo": "MSCU1234567"
}
```

## 管理后台接口

### 仪表盘数据
```http
GET /admin/dashboard
Authorization: Bearer {token}
```

### 客户列表
```http
GET /admin/companies?page=1&pageSize=20&status=ACTIVE
Authorization: Bearer {token}
```

### 更新客户状态
```http
PUT /admin/companies/{id}/status
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "status": "ACTIVE"
}
```

### 所有订单列表
```http
GET /admin/orders?page=1&pageSize=20
Authorization: Bearer {token}
```

### 更新订单状态
```http
PUT /admin/orders/{id}/status
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "status": "CONFIRMED",
  "remark": "订单已确认"
}
```

### 所有账单列表
```http
GET /admin/bills?page=1&pageSize=20
Authorization: Bearer {token}
```

### 确认收款
```http
PUT /admin/bills/{id}/payment
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "paidAmount": 15800,
  "remark": "线下转账"
}
```

## Webhook接口

### 4portun数据推送
```http
POST /sync/webhook/4portun
```

**请求头**:
```
X-Signature: {hmac_signature}
```

**请求体**:
```json
{
  "containerNo": "MSCU1234567",
  "events": [
    {
      "nodeCode": "DEPARTURE",
      "nodeName": "船舶离港",
      "location": "上海港",
      "eventTime": "2024-06-21T08:30:00Z"
    }
  ]
}
```

## 健康检查

```http
GET /health
```

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2024-06-21T08:30:00Z",
  "service": "freight-portal-api"
}
```
