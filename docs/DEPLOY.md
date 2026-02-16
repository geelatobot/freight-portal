# 货代客户门户 - 完整部署指南

## ⚠️ 安全提醒

**所有敏感信息（数据库密码、API Key等）请不要上传到GitHub！**

请在服务器本地创建 `.env` 文件，按照以下指南操作。

---

## 部署方式选择

### 方式一：Docker部署（推荐）
适合：快速部署、环境隔离

### 方式二：传统部署
适合：已有服务器环境、需要精细控制

---

## 方式一：Docker部署

### 1. 服务器准备

```bash
# 安装Docker
curl -fsSL https://get.docker.com | sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 下载代码

```bash
cd /opt
git clone https://github.com/geelatobot/freight-portal.git
cd freight-portal
```

### 3. 配置环境变量（⚠️ 在服务器上执行，不要提交到GitHub）

```bash
# 创建环境变量文件
cat > .env << 'EOF'
# 数据库 - 请替换为你的实际数据库信息
DATABASE_URL="mysql://username:password@your-rds-endpoint.mysql.rds.aliyuncs.com:3306/your-database"

# Redis（使用阿里云Redis或本地）
REDIS_URL="redis://localhost:6379"

# JWT密钥（请修改为随机字符串，生成方式: openssl rand -base64 32）
JWT_SECRET="your-jwt-secret-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# 4portun API（联系4portun获取）
# 文档: https://prod-api.4portun.com
FOURPORTUN_API_URL="https://prod-api.4portun.com"
FOURPORTUN_APPID="your-4portun-appid"
FOURPORTUN_SECRET="your-4portun-secret"
FOURPORTUN_WEBHOOK_SECRET="your-webhook-secret"

# Kimi AI API（联系月之暗面获取）
KIMI_API_URL="https://api.moonshot.cn/v1"
KIMI_API_KEY="your-kimi-api-key"

# 微信小程序（可选）
WECHAT_APPID="your-wechat-appid"
WECHAT_SECRET="your-wechat-secret"
EOF
```

### 4. 准备SSL证书

```bash
# 创建SSL目录
mkdir -p nginx/ssl

# 放置证书文件（从阿里云下载）
cp your_domain.crt nginx/ssl/cert.pem
cp your_domain.key nginx/ssl/key.pem
```

### 5. 执行数据库迁移

```bash
# 安装Node.js（仅用于迁移）
npm install -g n
n 20

# 进入backend目录
cd backend
npm install
npx prisma migrate deploy
npx prisma generate

# 返回根目录
cd ..
```

### 6. 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f app

# 查看状态
docker-compose ps
```

### 7. 验证部署

```bash
# 健康检查
curl https://your-domain.com/api/v1/health

# 预期返回
{"status":"ok","timestamp":"...","service":"freight-portal-api"}
```

---

## 方式二：传统部署

### 1. 环境准备

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm mysql-client redis-server nginx

# 安装Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

### 2. 下载代码

```bash
cd /opt
git clone https://github.com/geelatobot/freight-portal.git
cd freight-portal/backend
```

### 3. 配置环境变量（⚠️ 在服务器上执行）

```bash
cp .env.example .env
# 编辑.env文件，填入实际配置（不要上传GitHub）
```

### 4. 数据库迁移

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. 构建应用

```bash
npm run build
```

### 6. 配置Nginx

```bash
sudo tee /etc/nginx/sites-available/freight-portal << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/freight-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. 启动服务

```bash
# 使用PM2启动
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save
pm2 startup
```

---

## 常用命令

### Docker部署

```bash
# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart app

# 停止服务
docker-compose down

# 更新部署
git pull
docker-compose up -d --build
```

### 传统部署

```bash
# 查看日志
pm2 logs freight-portal-api

# 重启服务
pm2 reload freight-portal-api

# 停止服务
pm2 stop freight-portal-api

# 更新部署
git pull
npm install
npm run build
pm2 reload freight-portal-api
```

---

## 故障排查

### 数据库连接失败

```bash
# 测试数据库连接（替换为你的实际信息）
mysql -h your-rds-endpoint.mysql.rds.aliyuncs.com \
  -u your-username -p'your-password' -e "SHOW DATABASES;"

# 检查安全组
# 确保ECS服务器的IP在RDS白名单中
```

### 服务启动失败

```bash
# 查看详细日志
docker-compose logs app
# 或
pm2 logs freight-portal-api --lines 100

# 检查端口占用
netstat -tlnp | grep 3000
```

### 数据库迁移失败

```bash
# 重置迁移（谨慎使用）
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status
```

---

## 安全建议

1. **修改JWT密钥** - 使用随机生成的长字符串
2. **配置防火墙** - 只开放80/443端口
3. **定期备份** - 设置数据库自动备份
4. **更新依赖** - 定期运行 `npm audit fix`
5. **监控日志** - 配置日志告警
6. **保护敏感信息** - 永远不要将.env文件提交到GitHub

---

## .gitignore 配置

确保 `.gitignore` 包含以下文件：

```
# 环境变量
.env
.env.local
.env.*.local

# 敏感配置
*.pem
*.key

# 日志
logs/
*.log

# 上传文件
uploads/
```

---

## 访问信息

部署完成后：

| 服务 | 地址 | 说明 |
|------|------|------|
| API | `https://your-domain.com/api/v1` | 后端API |
| 健康检查 | `https://your-domain.com/api/v1/health` | 服务状态 |
| 数据库 | 阿里云RDS | 已配置 |

默认没有创建用户，需要通过注册接口创建第一个用户。
