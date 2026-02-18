# API 接口问题清单与修复计划

> 生成时间: 2026-02-18  
> 检查范围: 前后端接口集成

---

## 一、问题清单

### 🔴 P0 - 严重问题（阻塞功能）

| 序号 | 问题 | 前端调用 | 后端实现 | 影响 | 修复方案 |
|------|------|----------|----------|------|----------|
| P0-1 | 用户资料接口缺失 | `GET /auth/profile` | ❌ 未实现 | 用户无法查看/修改资料 | 后端添加 `/auth/profile` |
| P0-2 | 货物跟踪接口缺失 | `GET /tracking/:containerNumber` | ❌ 未实现 | 货物跟踪功能无法使用 | 后端添加 `/tracking/:containerNumber` |
| P0-3 | 通知系统接口缺失 | `/notifications/*` | ❌ 未实现 | 通知功能完全不可用 | 后端实现通知模块 |
| P0-4 | Admin 认证接口缺失 | `GET /auth/me` | ❌ 未实现 | Admin 无法获取当前用户 | 后端添加 `/auth/me` |

### 🟡 P1 - 中等问题（影响体验）

| 序号 | 问题 | 前端调用 | 后端实现 | 影响 | 修复方案 |
|------|------|----------|----------|------|----------|
| P1-1 | 取消订单方法不匹配 | `POST /orders/:id/cancel` | `DELETE /orders/:id` | 取消订单功能异常 | 统一为 DELETE 方法 |
| P1-2 | 订单时间线接口缺失 | `GET /orders/:id/timeline` | ❌ 未实现 | 无法查看订单状态变更历史 | 后端添加订单时间线接口 |
| P1-3 | Admin 企业详情接口缺失 | `GET /admin/companies/:id` | ❌ 未实现 | Admin 无法查看企业详情 | 后端添加 Admin 企业详情接口 |
| P1-4 | Admin 企业信用额度接口缺失 | `PUT /admin/companies/:id/credit` | ❌ 未实现 | Admin 无法调整信用额度 | 后端添加信用额度接口 |

### 🟢 P2 - 低优先级（功能增强）

| 序号 | 问题 | 前端调用 | 后端实现 | 影响 | 修复方案 |
|------|------|----------|----------|------|----------|
| P2-1 | 登出接口缺失 | `POST /auth/logout` | ❌ 未实现 | 无法安全登出 | 后端添加登出接口 |
| P2-2 | 批量跟踪接口缺失 | `POST /tracking/batch` | ❌ 未实现 | 无法批量查询货物 | 后端添加批量跟踪接口 |
| P2-3 | 跟踪历史接口缺失 | `GET /tracking/:id/history` | ❌ 未实现 | 无法查看跟踪历史 | 后端添加历史接口 |
| P2-4 | 订阅接口缺失 | `POST /tracking/:id/subscribe` | ❌ 未实现 | 无法订阅货物状态 | 后端添加订阅接口 |
| P2-5 | 订单导出接口缺失 | `GET /orders/export` | ❌ 未实现 | 无法导出订单 | 后端添加导出接口 |
| P2-6 | 货物同步接口缺失 | `POST /shipments/:id/sync` | ❌ 未实现 | 无法手动同步货物 | 后端添加同步接口 |
| P2-7 | 货物节点接口缺失 | `GET /shipments/:id/nodes` | ❌ 未实现 | 无法查看货物节点 | 后端添加节点接口 |

### 🔵 P3 - 优化建议

| 序号 | 问题 | 说明 | 修复方案 |
|------|------|------|----------|
| P3-1 | 接口路径不统一 | `/tracking` 和 `/shipments` 功能重叠 | 统一使用 `/shipments` |
| P3-2 | 参数命名不一致 | 前端 `containerNumber` vs 后端 `containerNo` | 统一命名为 `containerNo` |
| P3-3 | 分页参数不一致 | 前端 `limit` vs 后端 `pageSize` | 统一使用 `pageSize` |

---

## 二、修复计划

### 阶段一：P0 问题修复（优先级最高）

**任务 1.1: 后端添加 `/auth/profile` 接口**
- 文件: `src/modules/auth/auth.controller.ts`
- 方法: `GET /auth/profile`
- 功能: 返回当前登录用户信息
- 依赖: JwtAuthGuard

**任务 1.2: 后端添加 `/tracking/:containerNumber` 接口**
- 文件: `src/modules/shipment/shipment.controller.ts`
- 方法: `GET /tracking/:containerNo`
- 功能: 公开接口，查询集装箱跟踪信息
- 注意: 无需登录

**任务 1.3: 后端实现通知模块 `/notifications/*`**
- 创建: `src/modules/notification/`
- 包含: Controller, Service, DTO, Entity
- 接口:
  - `GET /notifications` - 获取通知列表
  - `PUT /notifications/:id/read` - 标记已读
  - `PUT /notifications/read-all` - 标记全部已读
  - `GET /notifications/unread-count` - 获取未读数量

**任务 1.4: 后端添加 `/auth/me` 接口（Admin）**
- 文件: `src/modules/admin/admin.controller.ts`
- 方法: `GET /auth/me`
- 功能: 返回当前管理员信息

### 阶段二：P1 问题修复

**任务 2.1: 统一取消订单接口**
- 前端: 修改 `services.ts` 使用 `DELETE /orders/:id`
- 后端: 确认 `OrderController.cancel()` 已实现

**任务 2.2: 后端添加订单时间线接口**
- 文件: `src/modules/order/order-lifecycle.controller.ts`
- 方法: `GET /orders/:id/timeline`
- 功能: 返回订单状态变更历史

**任务 2.3: 后端添加 Admin 企业详情接口**
- 文件: `src/modules/admin/admin.controller.ts`
- 方法: `GET /admin/companies/:id`
- 功能: 返回企业详细信息

**任务 2.4: 后端添加 Admin 信用额度接口**
- 文件: `src/modules/admin/admin.controller.ts`
- 方法: `PUT /admin/companies/:id/credit`
- 功能: 调整企业信用额度

### 阶段三：P2 问题修复

**任务 3.1-3.7**: 实现所有 P2 级别接口

### 阶段四：P3 优化

**任务 4.1-4.3**: 统一接口命名和参数

---

## 三、测试计划

### 单元测试

**后端测试**:
- 为每个新接口编写单元测试
- 覆盖率目标: >80%

**前端测试**:
- 测试 API 服务函数
- 测试错误处理

### 集成测试

**端到端测试**:
- 用户登录 → 查看资料 → 修改资料
- 查询货物 → 订阅货物 → 接收通知
- 创建订单 → 查看订单 → 取消订单

### 自动化测试

**API 自动化测试脚本**:
- 使用 Jest + Supertest
- 覆盖所有接口的正向和异常场景

---

## 四、验收标准

- [ ] 所有 P0 问题修复完成
- [ ] 所有 P1 问题修复完成
- [ ] 单元测试通过率 >95%
- [ ] 集成测试全部通过
- [ ] 前后端接口联调通过
- [ ] API 文档更新完成

---

## 五、风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 通知模块实现复杂 | 中 | 高 | 分阶段实现，先实现基础功能 |
| 接口变更影响前端 | 高 | 中 | 前后端同步修改，充分测试 |
| 测试覆盖不足 | 中 | 中 | 增加代码审查，补充测试用例 |
