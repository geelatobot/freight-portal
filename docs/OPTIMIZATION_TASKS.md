# 代码优化任务清单

> 生成时间: 2026-02-18  
> 目标: 抽取公共代码，减少重复，提高可维护性

---

## 一、问题分析

### 1.1 发现的重复代码模式

| 模式 | 出现次数 | 位置 |
|------|----------|------|
| Prisma mock 重复 | 211+ | 所有 .spec.ts 文件 |
| 订单号/账单号生成 | 5+ | order, billing, shipment 服务 |
| 用户数据脱敏 | 3+ | auth, customer 服务 |
| 日期格式化 | 多处 | 多个服务 |
| 分页查询逻辑 | 5+ | order, shipment, billing 等 |
| 响应格式化 | 多处 | 控制器层 |

### 1.2 优化目标

1. **抽取测试工具类** - 统一 Prisma mock、测试数据工厂
2. **抽取通用服务** - 编号生成、日期处理、数据脱敏
3. **抽取基础仓储** - 通用 CRUD、分页查询
4. **抽取响应工具** - 统一 API 响应格式
5. **优化 DTO** - 使用继承减少重复字段定义

---

## 二、详细任务

### 任务 1: 创建测试工具库 (test/utils/)

**1.1 创建 PrismaMockFactory**
- 文件: `test/utils/prisma-mock.factory.ts`
- 功能: 统一创建 Prisma Client mock
- 包含: 所有模型的 mock 方法

**1.2 创建 TestDataFactory**
- 文件: `test/utils/test-data.factory.ts`
- 功能: 生成测试数据对象
- 包含: User, Order, Shipment, Bill 等测试数据 builder

**1.3 创建测试模块配置**
- 文件: `test/utils/test-module.util.ts`
- 功能: 统一测试模块配置
- 包含: 全局管道、过滤器、Guard mock

**1.4 更新现有测试**
- 修改所有 .spec.ts 文件使用新的工具类
- 减少重复代码 60%+

### 任务 2: 创建通用服务 (common/services/)

**2.1 创建 CodeGeneratorService**
- 文件: `src/common/services/code-generator.service.ts`
- 功能: 统一编号生成
- 包含: 订单号、账单号、发票号、集装箱号生成
- 替换: OrderService, BillingService, ShipmentService 中的生成方法

**2.2 创建 DataSanitizerService**
- 文件: `src/common/services/data-sanitizer.service.ts`
- 功能: 数据脱敏
- 包含: 用户脱敏、日志脱敏
- 替换: AuthService, CustomerService 中的脱敏方法

**2.3 创建 DateUtilService**
- 文件: `src/common/services/date-util.service.ts`
- 功能: 日期工具
- 包含: 格式化、时区转换、日期计算
- 替换: 各服务中分散的日期处理

### 任务 3: 创建基础仓储 (common/repositories/)

**3.1 创建 BaseRepository**
- 文件: `src/common/repositories/base.repository.ts`
- 功能: 通用 CRUD 操作
- 包含: findAll, findOne, create, update, delete, paginate
- 使用: 泛型支持不同实体

**3.2 创建 PaginationUtil**
- 文件: `src/common/utils/pagination.util.ts`
- 功能: 分页逻辑封装
- 包含: 分页参数处理、分页响应格式化
- 替换: 各服务中重复的分页逻辑

### 任务 4: 优化 DTO (common/dto/)

**4.1 创建 BaseDto**
- 文件: `src/common/dto/base.dto.ts`
- 包含: id, createdAt, updatedAt 等通用字段

**4.2 创建 BaseQueryDto**
- 文件: `src/common/dto/base-query.dto.ts`
- 包含: page, pageSize, keyword, sortBy, sortOrder
- 替换: 各模块 QueryDto 中的重复字段

**4.3 创建 PaginationResponseDto**
- 文件: `src/common/dto/pagination-response.dto.ts`
- 包含: list, pagination (page, pageSize, total, totalPages)
- 替换: 各服务中重复的分页响应

### 任务 5: 优化控制器 (common/decorators/)

**5.1 创建 ApiResponseDecorator**
- 文件: `src/common/decorators/api-response.decorator.ts`
- 功能: 统一 API 响应装饰器
- 包含: 成功响应、错误响应、分页响应

**5.2 创建 PaginationDecorator**
- 文件: `src/common/decorators/pagination.decorator.ts`
- 功能: 分页参数装饰器
- 包含: 自动提取和验证分页参数

### 任务 6: 代码审查与测试

**6.1 代码审查**
- 检查所有修改的代码
- 确保没有引入新的问题
- 验证代码风格一致性

**6.2 运行测试**
- 运行所有单元测试
- 运行构建检查
- 确保测试覆盖率不降低

**6.3 生成优化报告**
- 统计代码行数变化
- 统计重复代码减少量
- 生成优化前后对比

---

## 三、执行计划

| 阶段 | 任务 | 预估工时 | 依赖 |
|------|------|----------|------|
| 1 | 测试工具库 | 4h | - |
| 2 | 通用服务 | 3h | - |
| 3 | 基础仓储 | 3h | - |
| 4 | DTO 优化 | 2h | - |
| 5 | 控制器优化 | 2h | 4 |
| 6 | 更新现有代码 | 4h | 1-5 |
| 7 | 代码审查 | 2h | 6 |
| 8 | 测试验证 | 2h | 7 |

**总计: 22 小时**

---

## 四、预期收益

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 测试代码重复率 | 70% | <20% | -50% |
| 服务层重复代码 | 40% | <10% | -30% |
| DTO 重复字段 | 50% | <15% | -35% |
| 总代码行数 | ~8000 | ~6500 | -19% |
| 测试可维护性 | 低 | 高 | 显著提升 |
