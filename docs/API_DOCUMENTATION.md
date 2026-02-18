# 货运门户后端 API 文档

## 概述

本文档列出了货运门户后端所有可用的 API 端点。

**基础 URL**: `/api/v1`

**认证方式**: JWT Token (Bearer)

---

## 认证相关接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/login` | 用户登录 | 否 |
| POST | `/auth/register` | 用户注册 | 否 |
| POST | `/auth/refresh` | 刷新 Token | 否 |

---

## 客户相关接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/customers/profile` | 获取客户资料 | 是 |
| GET | `/customers/companies` | 获取企业列表 | 是 |

---

## 订单相关接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/orders` | 获取订单列表 | 是 |
| GET | `/orders/:id` | 获取订单详情 | 是 |
| POST | `/orders` | 创建订单 | 是 |
| PUT | `/orders/:id` | 更新订单 | 是 |
| DELETE | `/orders/:id` | 取消/删除订单 | 是 |

### 订单生命周期管理接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/orders/:orderId/lifecycle/history` | 获取状态变更历史 | 是 |
| GET | `/orders/:orderId/lifecycle/transitions` | 获取可用状态流转选项 | 是 |
| POST | `/orders/:orderId/lifecycle/approve` | 审批订单 | 是 |
| POST | `/orders/:orderId/lifecycle/transition` | 执行状态流转 | 是 |
| POST | `/orders/:orderId/lifecycle/link-shipments` | 关联货物 | 是 |
| POST | `/orders/:orderId/lifecycle/auto-link` | 自动关联货物 | 是 |
| POST | `/orders/:orderId/lifecycle/unlink-shipments` | 解除货物关联 | 是 |
| POST | `/orders/lifecycle/batch-confirm` | 批量确认订单 | 是 |

### 订单状态机接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/order-state-machine/statuses` | 获取所有状态定义 | 是 |
| GET | `/order-state-machine/transitions` | 获取所有状态流转规则 | 是 |

---

## 货物/货运相关接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/shipments` | 获取货物列表 | 是 |
| GET | `/shipments/:id` | 获取货物详情 | 是 |
| POST | `/shipments/track` | 集装箱跟踪（公开接口） | 否 |
| GET | `/shipments/track/bl` | 根据提单号查询（公开接口） | 否 |

---

## 账单/财务相关接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/billing/bills` | 获取账单列表 | 是 |
| GET | `/billing/bills/:id` | 获取账单详情 | 是 |
| POST | `/billing/bills` | 创建账单 | 是 |
| PUT | `/billing/bills/:id/payment` | 确认收款 | 是 |
| GET | `/billing/stats` | 获取账单统计 | 是 |

### 账单生命周期管理接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/bills/generate-from-order` | 基于订单生成账单 | 是 |
| POST | `/bills/generate-from-shipment` | 基于货物生成账单 | 是 |
| POST | `/bills/:id/transition` | 账单状态流转 | 是 |
| POST | `/bills/:id/issue` | 开具账单 | 是 |
| POST | `/bills/:id/cancel` | 取消账单 | 是 |
| POST | `/bills/:id/payment` | 确认收款 | 是 |
| GET | `/bills/:id/history` | 获取账单状态历史 | 是 |
| POST | `/bills/:id/items` | 添加账单明细 | 是 |
| PUT | `/bills/:id/items/:itemId` | 更新账单明细 | 是 |
| DELETE | `/bills/:id/items/:itemId` | 删除账单明细 | 是 |
| PUT | `/bills/:id/items` | 批量更新账单明细 | 是 |
| GET | `/bills/metadata/statuses` | 获取所有账单状态定义 | 是 |
| GET | `/bills/metadata/types` | 获取所有账单类型定义 | 是 |

---

## AI 相关接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/ai/chat` | AI 聊天 | 是 |
| POST | `/ai/query-shipment` | AI 查询货物状态 | 是 |

---

## 管理后台接口

### 仪表盘

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/admin/dashboard` | 获取仪表盘统计数据 | 是 |

### 企业管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/admin/companies` | 获取企业列表 | 是 |
| PUT | `/admin/companies/:id/status` | 更新企业状态 | 是 |

### 订单管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/admin/orders` | 获取所有订单 | 是 |
| PUT | `/admin/orders/:id/status` | 更新订单状态 | 是 |

### 财务管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/admin/bills` | 获取所有账单 | 是 |
| PUT | `/admin/bills/:id/payment` | 确认收款 | 是 |

---

## 缺失的接口（需要后端实现）

以下接口前端已定义但后端尚未实现：

### Web 前端需要的接口

| 方法 | 路径 | 描述 | 优先级 |
|------|------|------|--------|
| POST | `/auth/logout` | 用户登出 | 中 |
| GET | `/auth/profile` | 获取用户资料 | 高 |
| PUT | `/auth/profile` | 更新用户资料 | 高 |
| GET | `/tracking/:containerNumber` | 获取货物跟踪状态 | 高 |
| POST | `/tracking/batch` | 批量查询货物跟踪 | 中 |
| GET | `/tracking/:containerNumber/history` | 获取跟踪历史 | 中 |
| POST | `/tracking/:containerNumber/subscribe` | 订阅跟踪 | 低 |
| DELETE | `/tracking/:containerNumber/subscribe` | 取消订阅跟踪 | 低 |
| GET | `/tracking/subscriptions` | 获取订阅列表 | 低 |
| POST | `/orders/:id/cancel` | 取消订单（前端当前使用 POST） | 高 |
| GET | `/orders/:id/timeline` | 获取订单时间线 | 中 |
| GET | `/notifications` | 获取通知列表 | 中 |
| PUT | `/notifications/:id/read` | 标记通知已读 | 中 |
| PUT | `/notifications/read-all` | 标记全部通知已读 | 低 |
| GET | `/notifications/unread-count` | 获取未读通知数量 | 中 |

### Admin 前端需要的接口

| 方法 | 路径 | 描述 | 优先级 |
|------|------|------|--------|
| GET | `/auth/me` | 获取当前管理员信息 | 高 |
| GET | `/admin/companies/:id` | 获取企业详情 | 中 |
| PUT | `/admin/companies/:id/credit` | 更新企业信用额度 | 中 |
| GET | `/admin/companies/:id/credit-history` | 获取企业信用历史 | 低 |
| GET | `/admin/orders/export` | 导出订单 | 中 |
| POST | `/shipments/:id/sync` | 同步货物状态 | 低 |
| GET | `/shipments/:id/nodes` | 获取货物节点 | 低 |

---

## 未使用但已实现的接口（可能需要前端补充调用）

以下接口后端已实现但前端尚未调用：

| 方法 | 路径 | 描述 | 建议 |
|------|------|------|------|
| POST | `/auth/refresh` | 刷新 Token | 已在 client.ts 拦截器中使用 |
| GET | `/customers/profile` | 获取客户资料 | 可用于替代 `/auth/profile` |
| GET | `/customers/companies` | 获取企业列表 | 可用于企业选择器 |
| POST | `/shipments/track` | 集装箱跟踪 | 可用于货物跟踪页面 |
| GET | `/shipments/track/bl` | 根据提单号查询 | 可用于货物跟踪页面 |
| GET | `/billing/stats` | 账单统计 | 可用于财务概览页面 |
| POST | `/billing/bills` | 创建账单 | 管理后台创建账单 |
| PUT | `/billing/bills/:id/payment` | 确认收款 | 与 `/bills/:id/payment` 重复 |
| POST | `/ai/chat` | AI 聊天 | 可用于 AI 助手功能 |
| POST | `/ai/query-shipment` | AI 查询货物 | 可用于 AI 助手功能 |

---

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 数据模型

### 订单状态 (OrderStatus)

- `PENDING` - 待确认
- `CONFIRMED` - 已确认
- `PROCESSING` - 执行中
- `COMPLETED` - 已完成
- `CANCELLED` - 已取消
- `REJECTED` - 已拒绝

### 账单状态 (BillStatus)

- `DRAFT` - 草稿
- `ISSUED` - 已开具
- `PARTIAL_PAID` - 部分支付
- `PAID` - 已支付
- `OVERDUE` - 逾期
- `CANCELLED` - 已取消

### 账单类型 (BillType)

- `FREIGHT` - 运费
- `AGENCY` - 代理费
- `CUSTOMS` - 报关费
- `INSURANCE` - 保险费
- `OTHER` - 其他

### 企业状态 (CompanyStatus)

- `PENDING` - 待审核
- `ACTIVE` - 正常
- `SUSPENDED` - 暂停
- `REJECTED` - 拒绝
