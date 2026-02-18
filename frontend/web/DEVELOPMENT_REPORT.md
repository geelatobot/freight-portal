# 货运门户 - 客户 Web 端开发完成报告

## 项目概述

已完成货运门户项目第三阶段 - 客户 Web 端前端开发。

## 完成的任务

### 任务 3.1.1: 项目脚手架 (8h) ✅

1. **Next.js 14 + TypeScript 项目初始化**
   - 目录: `frontend/web/`
   - 配置 Tailwind CSS
   - 配置 shadcn/ui 主题系统

2. **API Client 封装**
   - 封装 axios 实例
   - 请求/响应拦截器（自动添加 Token）
   - Token 自动刷新机制
   - 错误处理工具函数

3. **状态管理**
   - Zustand 配置
   - 用户状态管理（持久化存储）
   - 全局 loading 状态

### 任务 3.1.2: 认证与布局 (12h) ✅

1. **登录页面**
   - 表单验证（React Hook Form + Zod）
   - 记住密码功能
   - 错误提示
   - 加载状态

2. **注册页面**
   - 企业信息填写（企业名称、联系人、电话）
   - 表单验证
   - 注册成功提示

3. **主布局**
   - Sidebar 导航（响应式）
   - Header（用户信息、通知提醒）
   - Content 区域
   - 权限验证中间件

### 任务 3.1.3: 货物跟踪页面 (24h) ✅

1. **查询输入**
   - 集装箱号输入框
   - 表单验证
   - 批量查询支持（API 预留）

2. **货物状态展示**
   - 状态卡片（位置、预计到达、最后更新）
   - 时间轴节点（运输全程节点）
   - 状态标签颜色区分

3. **订阅功能**
   - 订阅/取消订阅按钮
   - 订阅列表页面
   - 新增订阅表单

### 任务 3.1.4: 订单中心页面 (20h) ✅

1. **订单列表**
   - 筛选条件（状态、搜索）
   - 分页功能
   - 状态标签（颜色区分）
   - 订单号/集装箱号搜索

2. **订单详情**
   - 基本信息展示
   - 货物信息（类型、重量、尺寸）
   - 运输路线（起运地→目的地）
   - 状态时间轴

3. **新建订单**
   - 分步表单（4步）
   - 货物信息录入
   - 尺寸重量输入
   - 路线信息
   - 确认提交

## 项目文件结构

```
frontend/web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # 登录页面
│   │   │   └── register/page.tsx     # 注册页面
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # 概览页面
│   │   │   ├── layout.tsx            # 仪表盘布局
│   │   │   ├── tracking/page.tsx     # 货物跟踪
│   │   │   ├── orders/               # 订单中心
│   │   │   │   ├── page.tsx          # 订单列表
│   │   │   │   ├── new/page.tsx      # 新建订单
│   │   │   │   └── [id]/page.tsx     # 订单详情
│   │   │   ├── subscriptions/page.tsx # 订阅管理
│   │   │   ├── notifications/page.tsx # 通知消息
│   │   │   └── settings/page.tsx     # 账户设置
│   │   └── ...
│   ├── components/
│   │   ├── ui/                       # UI 组件库
│   │   └── layout/                   # 布局组件
│   ├── lib/api/                      # API 封装
│   └── stores/                       # 状态管理
├── public/
├── components.json                   # shadcn/ui 配置
├── tailwind.config.ts
└── next.config.mjs
```

## 技术栈

- **框架**: Next.js 14 + React 18 + TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui (自定义组件)
- **状态管理**: Zustand + persist 中间件
- **表单**: React Hook Form + Zod 验证
- **HTTP 客户端**: Axios
- **图标**: Lucide React

## API 接口封装

所有后端 API 已封装在 `src/lib/api/services.ts`：

```typescript
// 认证 API
authApi.login(email, password)
authApi.register(data)
authApi.getProfile()
authApi.updateProfile(data)

// 货物跟踪 API
trackingApi.getCargoStatus(containerNumber)
trackingApi.batchQuery(containerNumbers)
trackingApi.subscribe(containerNumber)
trackingApi.unsubscribe(containerNumber)
trackingApi.getSubscriptions()

// 订单 API
orderApi.getOrders(params)
orderApi.getOrderById(id)
orderApi.createOrder(data)
orderApi.cancelOrder(id)

// 通知 API
notificationApi.getNotifications(params)
notificationApi.markAsRead(id)
notificationApi.markAllAsRead()
notificationApi.getUnreadCount()
```

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 重定向到登录 |
| `/auth/login` | 登录 | 企业用户登录 |
| `/auth/register` | 注册 | 企业用户注册 |
| `/dashboard` | 概览 | 业务数据概览 |
| `/dashboard/tracking` | 货物跟踪 | 查询货物状态 |
| `/dashboard/orders` | 订单列表 | 订单管理 |
| `/dashboard/orders/new` | 新建订单 | 分步创建订单 |
| `/dashboard/orders/[id]` | 订单详情 | 查看订单详情 |
| `/dashboard/subscriptions` | 订阅管理 | 货物订阅列表 |
| `/dashboard/notifications` | 通知消息 | 消息中心 |
| `/dashboard/settings` | 账户设置 | 企业信息修改 |

## 开发命令

```bash
# 进入项目目录
cd /root/.openclaw/workspace/projects/freight-portal/frontend/web

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 生产模式运行
npm start
```

## 环境变量配置

创建 `.env.local` 文件：

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## 注意事项

1. 项目使用 Next.js 14 App Router 架构
2. 所有页面组件使用 'use client' 指令（因使用 React Hook Form 等客户端库）
3. 认证状态通过 Zustand + localStorage 持久化
4. API 请求自动携带 Token，支持自动刷新
5. 响应式设计，支持移动端访问

## 截图路径

项目截图保存在: `/root/.openclaw/workspace/projects/freight-portal/screenshots/`

由于构建环境内存限制，建议本地运行开发服务器查看页面效果：
```bash
cd frontend/web && npm run dev
```
