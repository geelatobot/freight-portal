# 货运门户部署运维文档

## 文档概述

本文档包含货运门户项目的完整部署与运维配置，涵盖环境配置、自动化部署、监控告警、日志系统等各个方面。

## 文档清单

| 文档 | 路径 | 说明 |
|------|------|------|
| 生产环境配置 | `backend/.env.production` | 生产环境环境变量模板 |
| 部署脚本 | `deploy.sh` | 自动化部署脚本 |
| 回滚脚本 | `rollback.sh` | 版本回滚脚本 |
| 阿里云资源 | `docs/aliyun-resources.md` | 阿里云资源配置指南 |
| 监控告警 | `docs/monitoring-alerting.md` | ARMS接入与告警配置 |
| 日志系统 | `docs/logging-system.md` | SLS接入与日志配置 |
| 部署指南 | `docs/DEPLOYMENT.md` | 完整部署指南（本文档） |

---

## 快速开始

### 1. 环境准备

```bash
# 1. 克隆代码
git clone https://github.com/your-org/freight-portal.git
cd freight-portal

# 2. 安装依赖
cd backend
npm install

# 3. 配置环境变量
cp .env.production .env.production.local
# 编辑 .env.production.local 填写实际配置

# 4. 执行部署
chmod +x ../deploy.sh
sudo ../deploy.sh
```

### 2. 配置检查清单

#### 数据库配置
- [ ] RDS MySQL 实例已创建
- [ ] 数据库用户已创建并授权
- [ ] 连接白名单已配置
- [ ] 自动备份已启用
- [ ] 监控告警已配置

#### Redis 配置
- [ ] Redis 实例已创建
- [ ] 密码已设置
- [ ] 白名单已配置
- [ ] 持久化已启用

#### OSS 配置
- [ ] Bucket 已创建
- [ ] 跨域规则已配置
- [ ] CDN 加速已启用
- [ ] 生命周期规则已配置
- [ ] RAM 权限已配置

#### 应用配置
- [ ] JWT Secret 已生成（强随机字符串）
- [ ] 4portun API 凭证已配置
- [ ] Kimi API Key 已配置
- [ ] 微信小程序凭证已配置

#### 监控配置
- [ ] ARMS License Key 已配置
- [ ] SLS 项目已创建
- [ ] 告警联系人已配置
- [ ] 钉钉/企业微信机器人已配置

---

## 部署流程

### 首次部署

```bash
# 1. 准备服务器
sudo apt-get update
sudo apt-get install -y nodejs npm mysql-client redis-tools

# 2. 安装 PM2
sudo npm install -g pm2

# 3. 创建应用目录
sudo mkdir -p /opt/freight-portal
sudo chown $USER:$USER /opt/freight-portal

# 4. 克隆代码
git clone https://github.com/your-org/freight-portal.git /opt/freight-portal

# 5. 配置环境变量
cd /opt/freight-portal/backend
cp .env.production .env.production.local
vim .env.production.local  # 编辑配置

# 6. 执行部署
cd /opt/freight-portal
chmod +x deploy.sh
./deploy.sh

# 7. 配置 PM2 开机自启
pm2 startup
pm2 save
```

### 日常更新部署

```bash
# 执行部署脚本
cd /opt/freight-portal
./deploy.sh

# 查看部署日志
tail -f /var/log/freight-portal/deploy.log

# 查看应用状态
pm2 status
pm2 logs freight-portal-api
```

### 紧急回滚

```bash
# 回滚到上一个版本
cd /opt/freight-portal
./rollback.sh

# 回滚到指定版本
./rollback.sh 20240115_120000

# 查看可用备份
./rollback.sh list

# 撤销回滚
./rollback.sh undo
```

---

## 目录结构

```
/opt/freight-portal/
├── backend/                    # 后端代码
│   ├── dist/                   # 构建产物
│   ├── src/                    # 源代码
│   ├── prisma/                 # 数据库模型
│   ├── .env.production         # 生产环境配置模板
│   ├── .env.production.local   # 实际配置文件（不提交git）
│   ├── ecosystem.config.js     # PM2配置
│   └── package.json
├── logs/                       # 日志目录
│   ├── app-YYYY-MM-DD.log
│   ├── error-YYYY-MM-DD.log
│   └── combined.log
├── deploy.sh                   # 部署脚本
├── rollback.sh                 # 回滚脚本
└── docs/                       # 文档
    ├── DEPLOYMENT.md           # 部署指南
    ├── aliyun-resources.md     # 阿里云配置
    ├── monitoring-alerting.md  # 监控告警
    └── logging-system.md       # 日志系统

/opt/backups/freight-portal/    # 备份目录
├── 20240115_120000/            # 备份版本
│   ├── dist/
│   ├── package.json
│   └── database.sql
└── latest                      # 最新备份指针
```

---

## 常用命令

### 应用管理

```bash
# 查看状态
pm2 status
pm2 show freight-portal-api

# 查看日志
pm2 logs freight-portal-api
pm2 logs freight-portal-api --lines 100

# 重启应用
pm2 restart freight-portal-api

# 重载应用（零停机）
pm2 reload freight-portal-api

# 停止应用
pm2 stop freight-portal-api

# 删除应用
pm2 delete freight-portal-api
```

### 数据库操作

```bash
# 执行迁移
cd /opt/freight-portal/backend
npx prisma migrate deploy

# 生成客户端
npx prisma generate

# 查看数据库
npx prisma studio

# 备份数据库
mysqldump -h rm-xxx.mysql.rds.aliyuncs.com -u freight_user -p freight_portal_prod > backup.sql

# 恢复数据库
mysql -h rm-xxx.mysql.rds.aliyuncs.com -u freight_user -p freight_portal_prod < backup.sql
```

### 健康检查

```bash
# 基础健康检查
curl http://localhost:3000/api/v1/health

# 详细健康检查
curl http://localhost:3000/api/v1/health/detailed

# 就绪探针
curl http://localhost:3000/api/v1/health/readiness

# 存活探针
curl http://localhost:3000/api/v1/health/liveness

# 业务指标
curl http://localhost:3000/api/v1/health/metrics

# Prometheus 指标
curl http://localhost:3000/metrics
```

---

## 故障排查

### 应用无法启动

```bash
# 1. 检查环境变量
cat /opt/freight-portal/backend/.env.production.local

# 2. 检查端口占用
netstat -tlnp | grep 3000

# 3. 查看错误日志
pm2 logs freight-portal-api --err

# 4. 检查数据库连接
mysql -h rm-xxx.mysql.rds.aliyuncs.com -u freight_user -p -e "SELECT 1"

# 5. 检查 Redis 连接
redis-cli -h r-xxx.redis.rds.aliyuncs.com -a password PING
```

### 数据库连接问题

```bash
# 检查连接数
mysql -e "SHOW STATUS LIKE 'Threads_connected';"

# 查看慢查询
mysql -e "SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;"

# 查看锁等待
mysql -e "SHOW ENGINE INNODB STATUS;"
```

### 内存不足

```bash
# 查看内存使用
free -h

# 查看 Node.js 内存使用
pm2 show freight-portal-api | grep memory

# 调整 PM2 内存限制
pm2 restart freight-portal-api --max-memory-restart 2G
```

---

## 安全注意事项

1. **环境变量安全**
   - `.env.production.local` 不要提交到 Git
   - 定期轮换 API Key 和密码
   - 使用强密码策略

2. **访问控制**
   - 数据库仅允许应用服务器访问
   - Redis 设置强密码
   - OSS Bucket 设置为私有

3. **日志脱敏**
   - 日志中不包含敏感信息
   - 用户密码、Token 等字段已脱敏

4. **定期备份**
   - 数据库每日自动备份
   - 代码每次部署自动备份
   - 定期测试备份恢复

---

## 联系与支持

- **技术支持**: tech@yourdomain.com
- **运维值班**: ops@yourdomain.com
- **紧急联系**: 138-xxxx-xxxx

---

## 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2024-01-15 | 1.0.0 | 初始版本，完成基础部署配置 |
