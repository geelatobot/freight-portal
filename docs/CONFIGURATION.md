# 配置清单

## 文件清单

### 生产环境配置
| 文件路径 | 说明 | 状态 |
|---------|------|------|
| `backend/.env.production` | 生产环境环境变量模板 | ✅ 已创建 |

### 部署脚本
| 文件路径 | 说明 | 状态 |
|---------|------|------|
| `deploy.sh` | 自动化部署脚本 | ✅ 已创建 |
| `rollback.sh` | 版本回滚脚本 | ✅ 已创建 |

### 健康检查
| 文件路径 | 说明 | 状态 |
|---------|------|------|
| `backend/src/common/health/health.controller.ts` | 健康检查端点 | ✅ 已更新 |

### 文档
| 文件路径 | 说明 | 状态 |
|---------|------|------|
| `docs/DEPLOYMENT.md` | 部署运维总览文档 | ✅ 已创建 |
| `docs/aliyun-resources.md` | 阿里云资源配置指南 | ✅ 已创建 |
| `docs/monitoring-alerting.md` | 监控告警配置指南 | ✅ 已创建 |
| `docs/logging-system.md` | 日志系统配置指南 | ✅ 已创建 |

---

## 环境变量配置清单

### 基础服务
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| DATABASE_URL | MySQL 连接字符串 | ✅ | `mysql://user:pass@host:3306/db` |
| DATABASE_READ_URL | 只读库连接字符串 | ❌ | `mysql://user:pass@host:3306/db` |
| REDIS_URL | Redis 连接字符串 | ✅ | `redis://:pass@host:6379` |
| REDIS_DB | Redis 数据库号 | ❌ | `0` |

### 服务器配置
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| PORT | 服务端口 | ✅ | `3000` |
| NODE_ENV | 环境标识 | ✅ | `production` |
| API_PREFIX | API 前缀 | ✅ | `/api/v1` |
| CORS_ORIGIN | CORS 允许域名 | ✅ | `https://domain.com` |

### JWT 配置
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| JWT_SECRET | JWT 签名密钥 | ✅ | 64位随机字符串 |
| JWT_EXPIRES_IN | Token 过期时间 | ✅ | `15m` |
| JWT_REFRESH_EXPIRES_IN | 刷新Token过期时间 | ✅ | `7d` |

### 4portun API
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| FOURPORTUN_API_URL | API 基础地址 | ✅ | `https://prod-api.4portun.com` |
| FOURPORTUN_APPID | 应用ID | ✅ | `your-appid` |
| FOURPORTUN_SECRET | 应用密钥 | ✅ | `your-secret` |
| FOURPORTUN_WEBHOOK_SECRET | Webhook 签名密钥 | ✅ | `your-webhook-secret` |
| FOURPORTUN_SYNC_INTERVAL | 同步间隔 | ❌ | `*/5 * * * *` |
| FOURPORTUN_SYNC_BATCH_SIZE | 同步批次大小 | ❌ | `50` |

### Kimi AI
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| KIMI_API_URL | API 基础地址 | ✅ | `https://api.moonshot.cn/v1` |
| KIMI_API_KEY | API 密钥 | ✅ | `your-api-key` |
| KIMI_MODEL | 模型名称 | ❌ | `moonshot-v1-8k` |

### 阿里云 OSS
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| OSS_REGION | 存储区域 | ✅ | `oss-cn-hangzhou` |
| OSS_BUCKET | Bucket 名称 | ✅ | `freight-portal-prod` |
| OSS_ACCESS_KEY_ID | AccessKey ID | ✅ | `your-key-id` |
| OSS_ACCESS_KEY_SECRET | AccessKey Secret | ✅ | `your-key-secret` |
| OSS_CUSTOM_DOMAIN | 自定义域名 | ❌ | `https://cdn.domain.com` |

### 微信小程序
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| WECHAT_APPID | 小程序 AppID | ✅ | `wx...` |
| WECHAT_SECRET | 小程序密钥 | ✅ | `...` |

### 日志配置
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| LOG_LEVEL | 日志级别 | ✅ | `info` |
| LOG_PATH | 日志路径 | ✅ | `/var/log/freight-portal` |
| LOG_RETENTION_DAYS | 日志保留天数 | ❌ | `30` |

### 阿里云 SLS
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| SLS_PROJECT | SLS 项目名称 | ❌ | `freight-portal-prod` |
| SLS_LOGSTORE | Logstore 名称 | ❌ | `app-logs` |
| SLS_ENDPOINT | SLS 接入点 | ❌ | `cn-hangzhou.log.aliyuncs.com` |
| SLS_ACCESS_KEY_ID | AccessKey ID | ❌ | `your-key-id` |
| SLS_ACCESS_KEY_SECRET | AccessKey Secret | ❌ | `your-key-secret` |

### 阿里云 ARMS
| 变量名 | 说明 | 必填 | 示例值 |
|--------|------|------|--------|
| ARMS_LICENSE_KEY | ARMS License Key | ❌ | `your-license-key` |
| ARMS_APP_NAME | 应用名称 | ❌ | `freight-portal-api` |
| ARMS_REGION | 地域 | ❌ | `cn-hangzhou` |
| APM_ENABLED | 启用 APM | ❌ | `true` |
| APM_SAMPLE_RATE | 采样率 | ❌ | `0.1` |

---

## API 端点清单

### 健康检查端点
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/health` | GET | 基础健康检查 |
| `/api/v1/health/detailed` | GET | 详细健康检查 |
| `/api/v1/health/liveness` | GET | 存活探针 |
| `/api/v1/health/readiness` | GET | 就绪探针 |
| `/api/v1/health/metrics` | GET | 业务指标 |
| `/metrics` | GET | Prometheus 指标 |

---

## 阿里云资源清单

### RDS MySQL
| 配置项 | 建议值 |
|--------|--------|
| 实例规格 | 4核8G (rds.mysql.c2.xlarge) |
| 存储 | 500GB SSD |
| 连接数 | 1200 |
| 架构 | 主备架构 |
| 备份保留 | 30天 |

### Redis
| 配置项 | 建议值 |
|--------|--------|
| 实例规格 | 4GB 集群版 |
| 架构 | 双副本集群 |
| 分片数 | 4个 |
| QPS | 160,000 |

### OSS
| 配置项 | 建议值 |
|--------|--------|
| Bucket 名称 | freight-portal-prod |
| 存储类型 | 标准存储 |
| 权限 | 私有 |
| CDN 加速 | 启用 |

---

## 监控告警清单

### 服务器资源告警
| 告警名称 | 指标 | 阈值 | 级别 |
|---------|------|------|------|
| CPU 使用率 | CPUUtilization | > 80% | 警告 |
| 内存使用率 | MemoryUtilization | > 85% | 警告 |
| 磁盘使用率 | DiskUtilization | > 90% | 严重 |
| 实例宕机 | StatusCheckFailed | > 0 | 严重 |

### 应用异常告警
| 告警名称 | 指标 | 阈值 | 级别 |
|---------|------|------|------|
| 应用错误率 | http_5xx_errors / total | > 1% | 严重 |
| API 响应时间 | p99 duration | > 2s | 警告 |
| 内存使用 | heap_size_used | > 1GB | 警告 |
| Event Loop 延迟 | eventloop_lag | > 100ms | 严重 |

### 4portun 同步告警
| 告警名称 | 指标 | 阈值 | 级别 |
|---------|------|------|------|
| 同步失败次数 | sync failures | > 10/小时 | 严重 |
| 同步成功率 | success_rate | < 95% | 警告 |
| 最后同步时间 | last_sync | > 30分钟 | 严重 |
| 同步耗时 | duration | > 60s | 警告 |

---

## 部署检查清单

### 部署前检查
- [ ] 代码已合并到 main 分支
- [ ] 所有测试已通过
- [ ] 数据库迁移脚本已准备
- [ ] 配置文件已更新
- [ ] 备份空间充足

### 部署中检查
- [ ] 依赖安装成功
- [ ] 数据库迁移成功
- [ ] 构建成功
- [ ] 健康检查通过
- [ ] 业务功能正常

### 部署后检查
- [ ] 应用运行稳定
- [ ] 日志正常输出
- [ ] 监控数据正常
- [ ] 告警规则生效
- [ ] 备份已创建

---

*配置清单版本: 1.0.0*
*更新时间: 2024-01-15*
