# 货运门户阿里云资源配置指南

## 1. RDS MySQL 配置建议

### 实例规格选择

| 业务规模 | 实例规格 | CPU/内存 | 存储 | 连接数 |
|---------|---------|---------|------|--------|
| 小型（<100用户） | rds.mysql.s2.large | 2核4G | 100GB SSD | 600 |
| 中型（100-1000用户） | rds.mysql.c2.xlarge | 4核8G | 500GB SSD | 1200 |
| 大型（1000+用户） | rds.mysql.c2.2xlarge | 8核16G | 1TB SSD | 2000 |

### 数据库配置参数

```ini
# my.cnf 推荐配置
[mysqld]
# 字符集
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# InnoDB 缓冲池（设置为内存的50-70%）
innodb_buffer_pool_size=4G

# 连接数
max_connections=1000
max_user_connections=900

# 查询缓存（MySQL 8.0+ 已移除）
# query_cache_type=1
# query_cache_size=256M

# 临时表
tmp_table_size=128M
max_heap_table_size=128M

# 排序缓冲区
sort_buffer_size=4M
read_buffer_size=2M
read_rnd_buffer_size=8M

# InnoDB 日志
innodb_log_file_size=512M
innodb_log_buffer_size=64M
innodb_flush_log_at_trx_commit=2
innodb_flush_method=O_DIRECT

# 慢查询日志
slow_query_log=1
long_query_time=2
log_queries_not_using_indexes=1
```

### 备份策略

```yaml
自动备份:
  备份周期: 每天
  备份时间: 02:00-06:00
  保留天数: 30天

binlog保留: 7天

跨地域备份:
  启用: true
  目标地域: 根据业务选择
```

### 高可用配置

```yaml
架构: 主备架构
同步方式: 半同步复制
自动故障切换: 启用
切换时间: <30秒

只读实例:
  数量: 1-2个
  用途: 报表查询、数据分析
  延迟: <1秒
```

---

## 2. Redis 配置建议

### 实例规格选择

| 业务规模 | 实例规格 | 内存 | 连接数 | QPS |
|---------|---------|------|--------|-----|
| 小型 | redis.master.small.default | 1GB | 10,000 | 80,000 |
| 中型 | redis.master.mid.default | 4GB | 20,000 | 160,000 |
| 大型 | redis.master.large.default | 8GB | 50,000 | 240,000 |

### 集群版配置（推荐）

```yaml
架构: 集群版（双副本）
分片数: 4-8个
每分片容量: 2GB
总容量: 8-16GB

优势:
  - 自动数据分片
  - 水平扩展
  - 高可用性
  - 性能线性增长
```

### Redis 配置参数

```bash
# 持久化配置
save 900 1
save 300 10
save 60 10000

# AOF 配置
appendonly yes
appendfsync everysec

# 内存策略
maxmemory-policy allkeys-lru

# 超时设置
timeout 300
tcp-keepalive 60

# 慢查询
slowlog-log-slower-than 10000
slowlog-max-len 128
```

### 使用场景分配

| DB | 用途 | 过期策略 |
|----|------|---------|
| 0 | 会话缓存 | 24小时 |
| 1 | API 限流计数器 | 1分钟滑动窗口 |
| 2 | 热点数据缓存 | 1小时 |
| 3 | 分布式锁 | 30秒 |
| 4 | 消息队列 | 不自动过期 |
| 5 | 统计计数 | 24小时 |

---

## 3. OSS 配置建议

### Bucket 配置

```yaml
Bucket名称: freight-portal-prod
地域: 华东1（杭州）
存储类型: 标准存储

权限设置:
  读写权限: 私有
  
防盗链:
  启用: true
  允许空Referer: false
  Referer白名单:
    - https://freight.yourdomain.com
    - https://admin.freight.yourdomain.com
    - https://*.yourdomain.com

跨域设置:
  来源: https://freight.yourdomain.com
  允许Methods: GET, POST, PUT, DELETE
  允许Headers: '*'
  暴露Headers: ETag, x-oss-request-id
  缓存时间: 3600
```

### 生命周期规则

```yaml
规则1-临时文件清理:
  前缀: temp/
  过期时间: 7天
  操作: 删除

规则2-版本控制:
  启用版本控制: true
  非当前版本保留: 30天
  删除标记清理: 启用

规则3-低频转换:
  前缀: archive/
  转换时间: 90天
  存储类型: 低频访问
  
规则4-归档转换:
  前缀: backup/
  转换时间: 180天
  存储类型: 归档存储
```

### CDN 加速配置

```yaml
CDN域名: cdn.yourdomain.com
源站: freight-portal-prod.oss-cn-hangzhou.aliyuncs.com

缓存策略:
  图片文件(*.jpg,*.png,*.gif):
    缓存时间: 30天
  
  文档文件(*.pdf,*.doc):
    缓存时间: 7天
  
  其他文件:
    缓存时间: 1天

HTTPS:
  启用: true
  证书: 阿里云托管证书
  HTTP/2: 启用

性能优化:
  页面优化: 启用
  智能压缩: 启用
  Brotli压缩: 启用
```

### RAM 权限策略

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject",
        "oss:ListParts",
        "oss:AbortMultipartUpload"
      ],
      "Resource": [
        "acs:oss:*:*:freight-portal-prod/*",
        "acs:oss:*:*:freight-portal-prod"
      ],
      "Condition": {
        "StringEquals": {
          "acs:SecureTransport": "true"
        }
      }
    }
  ]
}
```

---

## 4. 安全组配置

### 应用服务器安全组

| 协议 | 端口 | 授权对象 | 说明 |
|------|------|---------|------|
| TCP | 22 | 公司IP/堡垒机 | SSH管理 |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 3000 | 内网IP段 | 应用服务 |

### 数据库安全组

| 协议 | 端口 | 授权对象 | 说明 |
|------|------|---------|------|
| TCP | 3306 | 应用服务器安全组 | MySQL |
| TCP | 6379 | 应用服务器安全组 | Redis |

---

## 5. 网络架构

```
┌─────────────────────────────────────────────────────────────┐
│                        公网入口                              │
│                   (SLB 负载均衡)                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │  ECS 1  │    │  ECS 2  │    │  ECS 3  │
   │ (Node)  │    │ (Node)  │    │ (Node)  │
   └────┬────┘    └────┬────┘    └────┬────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │  RDS    │    │  Redis  │    │  OSS    │
   │ (主/备)  │    │ (集群)  │    │ (存储)  │
   └─────────┘    └─────────┘    └─────────┘
```

---

## 6. 成本估算（月度）

| 服务 | 规格 | 预估费用 |
|------|------|---------|
| ECS | 2核4G × 2台 | ¥400 |
| RDS MySQL | 4核8G | ¥800 |
| Redis | 4GB集群版 | ¥600 |
| OSS | 500GB存储 | ¥100 |
| CDN | 100GB流量 | ¥50 |
| SLB | 标准型 | ¥100 |
| **总计** | | **¥2050/月** |
