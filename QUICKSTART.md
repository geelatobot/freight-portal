# 货代客户门户 - 快速启动指南

## 环境要求

- Node.js 20+
- MySQL 8.0+ (已配置阿里云RDS)
- Redis 6.0+ (可选)

## 快速启动（5分钟）

### 1. 克隆代码

```bash
git clone https://github.com/geelatobot/freight-portal.git
cd freight-portal/backend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量（⚠️ 重要：在服务器本地配置，不要上传GitHub）

```bash
# 创建 .env 文件
cat > .env << 'EOF'
# 数据库 - 请替换为你的实际数据库信息
DATABASE_URL="mysql://username:password@your-rds-endpoint.mysql.rds.aliyuncs.com:3306/your-database"

# JWT密钥（请修改为随机字符串）
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# 其他配置...
EOF
```

### 4. 执行迁移

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. 初始化数据（可选）

```bash
npx prisma db seed
```

这会创建管理员账号和示例数据。

### 6. 启动服务

```bash
# 开发模式
npm run start:dev

# 或生产模式
npm run build
npm run start:prod
```

### 7. 验证

```bash
# 健康检查
curl http://localhost:3000/api/v1/health

# 预期返回
{"status":"ok","timestamp":"...","service":"freight-portal-api"}
```

---

## API测试

### 注册
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com",
    "phone": "13800138000",
    "companyName": "测试公司"
  }'
```

### 登录
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123456"
  }'
```

### 查询货物
```bash
curl -X POST http://localhost:3000/api/v1/shipments/track \
  -H "Content-Type: application/json" \
  -d '{"containerNo": "MSCU1234567"}'
```

---

## 部署到生产

### Docker部署（推荐）

```bash
cd freight-portal

# 配置环境变量（在服务器上执行）
cp backend/.env.example .env
# 编辑.env，填入实际配置

# 启动
docker-compose up -d
```

### 传统部署

```bash
cd freight-portal/backend
npm install
npm run build
pm2 start ecosystem.config.js --env production
```

---

## 目录结构

```
freight-portal/
├── backend/              # NestJS后端
│   ├── src/             # 源代码
│   ├── prisma/          # 数据库模型
│   ├── Dockerfile       # Docker配置
│   └── package.json     # 依赖
├── frontend/            # 前端
│   ├── web/            # 客户Web端
│   ├── admin/          # 管理后台
│   └── miniapp/        # 微信小程序
├── nginx/               # Nginx配置
├── docker-compose.yml   # Docker编排
└── docs/                # 文档
    ├── API.md          # API文档
    ├── DEPLOY.md       # 部署指南
    └── TEST.md         # 测试文档
```

---

## 技术支持

- **GitHub**: https://github.com/geelatobot/freight-portal
- **API文档**: 见 docs/API.md
- **部署指南**: 见 docs/DEPLOY.md
- **测试文档**: 见 docs/TEST.md

---

## ⚠️ 安全提醒

**永远不要将以下文件提交到GitHub：**
- `.env` - 环境变量（包含数据库密码、API Key）
- `*.pem` `*.key` - SSL证书
- `logs/` - 日志文件

这些文件已添加到 `.gitignore` 中。

---

## 下一步

1. 配置4portun API Key
2. 配置Kimi API Key
3. 配置微信小程序（可选）
4. 部署到服务器
5. 配置域名和SSL
