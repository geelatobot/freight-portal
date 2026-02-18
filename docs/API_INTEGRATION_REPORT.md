# 货运门户前后端接口集成检查报告

## 检查时间
2026-02-18

## 检查范围
- 前端 API 文件: `frontend/web/src/lib/api/services.ts`
- 前端 Admin API: `frontend/admin/src/services/index.ts`
- 后端 Controllers:
  - `backend/src/modules/auth/auth.controller.ts`
  - `backend/src/modules/order/order.controller.ts`
  - `backend/src/modules/shipment/shipment.controller.ts`
  - `backend/src/modules/billing/billing.controller.ts`
  - `backend/src/modules/customer/customer.controller.ts`
  - `backend/src/modules/admin/admin.controller.ts`
  - `backend/src/modules/order/order-lifecycle.controller.ts`
  - `backend/src/modules/billing/bill-lifecycle.controller.ts`
  - `backend/src/modules/ai/ai.controller.ts`

---

## 1. 接口不匹配问题列表

### 🔴 严重问题（功能无法使用）

| # | 问题 | 前端调用 | 后端实现 | 影响 |
|---|------|----------|----------|------|
| 1 | **用户资料接口缺失** | `GET /auth/profile` | 不存在 | 用户无法查看/修改资料 |
| 2 | **货物跟踪接口缺失** | `GET /tracking/:containerNumber` | 不存在 | 货物跟踪功能完全失效 |
| 3 | **通知接口缺失** | `/notifications/*` | 不存在 | 通知系统完全失效 |
| 4 | **Admin 用户信息接口缺失** | `GET /auth/me` | 不存在 | Admin 无法获取当前用户信息 |

### 🟠 中等问题（功能部分受限）

| # | 问题 | 前端调用 | 后端实现 | 建议修复方案 |
|---|------|----------|----------|--------------|
| 5 | **取消订单方法不匹配** | `POST /orders/:id/cancel` | `DELETE /orders/:id` | 后端添加 POST /orders/:id/cancel 或前端改为 DELETE |
| 6 | **订单时间线接口缺失** | `GET /orders/:id/timeline` | 不存在 | 后端添加接口或使用 lifecycle/history 替代 |
| 7 | **Admin 企业详情接口缺失** | `GET /admin/companies/:id` | 不存在 | 后端添加接口 |
| 8 | **Admin 企业信用额度接口缺失** | `PUT /admin/companies/:id/credit` | 不存在 | 后端添加接口 |

### 🟡 低优先级问题（功能增强）

| # | 问题 | 前端调用 | 后端实现 | 优先级 |
|---|------|----------|----------|--------|
| 9 | **登出接口缺失** | `POST /auth/logout` | 不存在 | 低 |
| 10 | **批量跟踪接口缺失** | `POST /tracking/batch` | 不存在 | 低 |
| 11 | **跟踪历史接口缺失** | `GET /tracking/:id/history` | 不存在 | 低 |
| 12 | **订阅接口缺失** | `/tracking/:id/subscribe` | 不存在 | 低 |
| 13 | **Admin 订单导出接口缺失** | `GET /admin/orders/export` | 不存在 | 中 |
| 14 | **Admin 货物同步接口缺失** | `POST /shipments/:id/sync` | 不存在 | 低 |
| 15 | **Admin 货物节点接口缺失** | `GET /shipments/:id/nodes` | 不存在 | 低 |

---

## 2. 后端已实现但前端未使用的接口

以下接口后端已实现，但前端没有调用（可能需要前端补充）：

### 认证模块
- `POST /auth/refresh` - 已在 apiClient 拦截器中使用 ✅

### 客户模块
- `GET /customers/profile` - 可用于替代缺失的 `/auth/profile`
- `GET /customers/companies` - 可用于企业选择器

### 货物模块
- `POST /shipments/track` - 集装箱跟踪（公开接口）
- `GET /shipments/track/bl` - 根据提单号查询

### 账单模块
- `GET /billing/stats` - 账单统计
- `POST /billing/bills` - 创建账单
- `PUT /billing/bills/:id/payment` - 确认收款（与 `/bills/:id/payment` 重复）

### 订单生命周期模块
- `/orders/:orderId/lifecycle/*` - 完整的订单生命周期管理

### 账单生命周期模块
- `/bills/*` - 完整的账单生命周期管理

### AI 模块
- `POST /ai/chat` - AI 聊天
- `POST /ai/query-shipment` - AI 查询货物

---

## 3. 已创建的端点常量文件

| 文件路径 | 说明 |
|----------|------|
| `frontend/web/src/lib/api/endpoints.ts` | Web 前端 API 端点常量 |
| `frontend/web/src/lib/api/services.ts` | Web 前端 API 服务（已更新） |
| `frontend/admin/src/services/endpoints.ts` | Admin 前端 API 端点常量 |
| `frontend/admin/src/services/index.ts` | Admin 前端 API 服务（已更新） |

---

## 4. 后端 API 文档路径

| 文件路径 | 说明 |
|----------|------|
| `docs/API_DOCUMENTATION.md` | 完整的后端 API 文档 |

---

## 5. 修复建议

### 短期修复（1-2 天）

1. **用户资料接口**
   - 方案 A: 后端在 `auth.controller.ts` 添加 `/auth/profile` GET/PUT 接口
   - 方案 B: 前端改为调用 `/customers/profile`（已存在）

2. **货物跟踪接口**
   - 后端添加 `/tracking/:containerNumber` 接口，内部调用 `shipmentService.trackContainer`
   - 或前端改为调用 `/shipments/track`

3. **取消订单接口**
   - 后端添加 `POST /orders/:id/cancel` 接口
   - 或前端改为调用 `DELETE /orders/:id`

### 中期修复（3-5 天）

4. **通知系统**
   - 后端创建 `notification` 模块
   - 实现 `/notifications/*` 所有接口

5. **Admin 接口补充**
   - 后端添加 `/auth/me` 接口
   - 后端添加 `/admin/companies/:id` 接口
   - 后端添加 `/admin/companies/:id/credit` 接口

### 长期优化（1-2 周）

6. **接口统一**
   - 将 `/tracking/*` 统一合并到 `/shipments/*`
   - 移除重复的账单接口（`/billing/bills/:id/payment` vs `/bills/:id/payment`）

7. **前端使用新接口**
   - 前端使用订单生命周期接口
   - 前端使用账单生命周期接口
   - 前端集成 AI 接口

---

## 6. 文件变更汇总

### 新增文件
```
frontend/web/src/lib/api/endpoints.ts          (9.3 KB)
frontend/admin/src/services/endpoints.ts       (2.4 KB)
docs/API_DOCUMENTATION.md                      (6.0 KB)
```

### 修改文件
```
frontend/web/src/lib/api/services.ts           (完全重写，使用端点常量)
frontend/admin/src/services/index.ts           (使用端点常量)
```

---

## 7. 后续行动项

- [ ] 后端实现缺失的高优先级接口
- [ ] 前端测试更新后的 API 服务
- [ ] 统一前后端接口命名规范
- [ ] 考虑使用 Swagger/OpenAPI 自动生成文档
