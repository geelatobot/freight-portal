# 货代客户门户 - 开发启动指南

## 项目结构

```
freight-portal/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   │   ├── auth/       # 认证模块
│   │   │   ├── customer/   # 客户模块
│   │   │   ├── order/      # 订单模块
│   │   │   ├── shipment/   # 货物模块
│   │   │   ├── billing/    # 财务模块
│   │   │   ├── sync/       # 同步模块
│   │   │   ├── ai/         # AI模块
│   │   │   └── notify/     # 通知模块
│   │   ├── common/         # 公共模块
│   │   │   └── prisma/     # Prisma客户端
│   │   ├── config/         # 配置文件
│   │   ├── app.module.ts   # 根模块
│   │   └── main.ts         # 入口文件
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   ├── scripts/
│   │   └── deploy.sh       # 部署脚本
│   ├── package.json
│   ├── tsconfig.json
│   ├── ecosystem.config.js # PM2配置
│   └── .env.example        # 环境变量示例
│
├── frontend/
│   ├── web/                # 客户Web端
│   ├── admin/              # 管理后台
│   └── miniapp/            # 小程序
│
└── docs/                   # 文档
```

## 后端开发启动步骤

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填写实际配置
```

### 3. 启动数据库

确保 PostgreSQL 和 Redis 已安装并运行。

### 4. 执行数据库迁移

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. 启动开发服务器

```bash
npm run start:dev
```

服务将启动在 http://localhost:3000

## 常用命令

```bash
# 开发模式
npm run start:dev

# 生产构建
npm run build

# 生产启动
npm run start:prod

# PM2启动
npm run pm2:start

# 数据库迁移
npm run prisma:migrate

# 数据库可视化
npm run prisma:studio

# 代码检查
npm run lint

# 测试
npm run test
```

## API文档

启动服务后访问: http://localhost:3000/api/v1

## 部署

```bash
./scripts/deploy.sh production
```
