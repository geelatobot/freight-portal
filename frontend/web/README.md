# 货运门户 - 客户 Web 端

## 项目结构

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
│   │   │   ├── tracking/page.tsx     # 货物跟踪页面
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx          # 订单列表
│   │   │   │   ├── new/page.tsx      # 新建订单
│   │   │   │   └── [id]/page.tsx     # 订单详情
│   │   │   ├── subscriptions/page.tsx # 订阅管理
│   │   │   ├── notifications/page.tsx # 通知消息
│   │   │   └── settings/page.tsx     # 账户设置
│   │   ├── page.tsx                  # 首页（重定向到登录）
│   │   ├── layout.tsx                # 根布局
│   │   └── globals.css               # 全局样式
│   ├── components/
│   │   ├── ui/                       # UI 组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── table.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── checkbox.tsx
│   │   └── layout/                   # 布局组件
│   │       ├── MainLayout.tsx
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   ├── lib/
│   │   ├── utils.ts                  # 工具函数
│   │   └── api/
│   │       ├── client.ts             # Axios 封装
│   │       └── services.ts           # API 服务
│   └── stores/                       # Zustand 状态管理
│       ├── index.ts
│       ├── userStore.ts
│       └── loadingStore.ts
├── public/                           # 静态资源
├── components.json                   # shadcn/ui 配置
├── tailwind.config.ts                # Tailwind 配置
├── next.config.mjs                   # Next.js 配置
├── package.json
└── .env.local                        # 环境变量
```

## 技术栈

- **框架**: Next.js 14 + React 18 + TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui
- **状态管理**: Zustand
- **表单**: React Hook Form + Zod
- **HTTP 客户端**: Axios
- **图标**: Lucide React

## 功能模块

### 1. 认证模块
- 企业用户登录（邮箱 + 密码）
- 企业用户注册（企业信息填写）
- 记住密码功能
- Token 自动刷新

### 2. 货物跟踪
- 集装箱号查询
- 货物状态展示
- 运输时间轴
- 批量查询支持
- 订阅/取消订阅

### 3. 订单中心
- 订单列表（筛选、分页）
- 订单详情
- 新建订单（分步表单）
- 订单状态跟踪

### 4. 订阅管理
- 货物订阅列表
- 新增订阅
- 取消订阅

### 5. 通知消息
- 消息列表
- 未读消息提醒
- 标记已读

### 6. 账户设置
- 企业信息修改
- 联系人信息更新

## 开发命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产模式
npm start

# 代码检查
npm run lint
```

## 环境变量

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## API 接口对接

所有 API 接口封装在 `src/lib/api/services.ts` 中：

- `authApi` - 认证相关
- `trackingApi` - 货物跟踪
- `orderApi` - 订单管理
- `notificationApi` - 通知消息
