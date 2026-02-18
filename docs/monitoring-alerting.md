# 货运门户监控告警配置指南

## 1. 阿里云 ARMS 接入配置

### 1.1 应用监控 (APM)

#### 安装 ARMS Agent

```bash
# 方式1: 通过脚本安装
wget https://arms-apm.oss-cn-hangzhou.aliyuncs.com/arms-nodejs-agent/install.sh
sh install.sh -l <your-license-key> -r cn-hangzhou

# 方式2: 通过 npm 安装
npm install arms-nodejs-sdk --save
```

#### 代码集成

```typescript
// main.ts - 在应用启动时初始化 ARMS
import { NestFactory } from '@nestjs/common';
import * as arms from 'arms-nodejs-sdk';

async function bootstrap() {
  // 初始化 ARMS
  arms.start({
    appName: 'freight-portal-api',
    licenseKey: process.env.ARMS_LICENSE_KEY,
    region: 'cn-hangzhou',
    // 采样率
    sampleRate: parseFloat(process.env.APM_SAMPLE_RATE || '0.1'),
    // 忽略特定路径
    ignorePaths: ['/health', '/health/liveness', '/metrics'],
    // 自定义标签
    tags: {
      environment: 'production',
      version: process.env.npm_package_version,
    },
  });

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

#### 环境变量配置

```bash
# .env.production
ARMS_LICENSE_KEY=your-arms-license-key
ARMS_APP_NAME=freight-portal-api
ARMS_REGION=cn-hangzhou
APM_ENABLED=true
APM_SAMPLE_RATE=0.1
```

### 1.2 前端监控 (RUM)

```typescript
// 在 web 应用的入口文件添加
if (typeof window !== 'undefined') {
  !(function(c,b,d,a){c[a]||(c[a]={});c[a].config={
    pid: "your-rum-pid",
    appType: "web",
    imgUrl: "https://arms-retcode.aliyuncs.com/r.png?",
    sendResource: true,
    enableLinkTrace: true,
    enableSPA: true,
    useFmp: true
  };
  with(b)with(body)with(insertBefore(createElement("script"),firstChild))setAttribute("crossorigin","",src=d)
  })(window,document,"https://sdk.rum.aliyuncs.com/v1/bl.js","__bl");
}
```

---

## 2. 自定义业务指标

### 2.1 订单量统计

```typescript
// metrics/order.metrics.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class OrderMetrics {
  private orderCounter: Counter;
  private orderValueHistogram: Histogram;

  constructor(private readonly prisma: PrismaClient) {
    // 订单计数器
    this.orderCounter = new Counter({
      name: 'freight_orders_total',
      help: 'Total number of orders',
      labelNames: ['status', 'type'],
    });

    // 订单金额分布
    this.orderValueHistogram = new Histogram({
      name: 'freight_order_value_usd',
      help: 'Order value in USD',
      buckets: [100, 500, 1000, 5000, 10000, 50000],
    });
  }

  // 记录新订单
  recordOrder(status: string, type: string, value?: number) {
    this.orderCounter.inc({ status, type });
    if (value) {
      this.orderValueHistogram.observe(value);
    }
  }

  // 获取今日订单统计
  async getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, byStatus, byType] = await Promise.all([
      this.prisma.shipment.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.shipment.groupBy({
        by: ['status'],
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }),
      this.prisma.shipment.groupBy({
        by: ['containerType'],
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => ({
        ...acc,
        [item.status]: item._count.id,
      }), {}),
      byType: byType.reduce((acc, item) => ({
        ...acc,
        [item.containerType]: item._count.id,
      }), {}),
    };
  }
}
```

### 2.2 同步成功率监控

```typescript
// metrics/sync.metrics.ts
import { Injectable } from '@nestjs/common';
import { Counter, Gauge } from 'prom-client';

@Injectable()
export class SyncMetrics {
  private syncCounter: Counter;
  private syncDuration: Counter;
  private syncSuccessRate: Gauge;
  private lastSyncTime: Gauge;

  constructor() {
    // 同步次数计数器
    this.syncCounter = new Counter({
      name: 'fourportun_sync_total',
      help: 'Total number of sync operations',
      labelNames: ['result'], // success, failure
    });

    // 同步耗时
    this.syncDuration = new Counter({
      name: 'fourportun_sync_duration_seconds_total',
      help: 'Total duration of sync operations',
    });

    // 成功率（最近1小时）
    this.syncSuccessRate = new Gauge({
      name: 'fourportun_sync_success_rate',
      help: 'Sync success rate in the last hour',
    });

    // 最后同步时间
    this.lastSyncTime = new Gauge({
      name: 'fourportun_last_sync_timestamp',
      help: 'Timestamp of last successful sync',
    });
  }

  // 记录同步结果
  recordSync(result: 'success' | 'failure', durationMs: number) {
    this.syncCounter.inc({ result });
    this.syncDuration.inc(durationMs / 1000);

    if (result === 'success') {
      this.lastSyncTime.setToCurrentTime();
    }
  }

  // 更新成功率
  updateSuccessRate(rate: number) {
    this.syncSuccessRate.set(rate);
  }
}
```

### 2.3 API 响应时间监控

```typescript
// metrics/api.metrics.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Histogram, Counter } from 'prom-client';

@Injectable()
export class ApiMetricsMiddleware implements NestMiddleware {
  private httpRequestDuration: Histogram;
  private httpRequestsTotal: Counter;

  constructor() {
    // 响应时间直方图
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    // 请求总数
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const route = req.route?.path || req.path;

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const statusCode = res.statusCode.toString();

      this.httpRequestDuration.observe(
        { method: req.method, route, status_code: statusCode },
        duration,
      );

      this.httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: statusCode,
      });
    });

    next();
  }
}
```

### 2.4 指标收集服务

```typescript
// metrics/metrics.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, collectDefaultMetrics } from 'prom-client';
import { OrderMetrics } from './order.metrics';
import { SyncMetrics } from './sync.metrics';

@Injectable()
export class MetricsService implements OnModuleInit {
  public readonly registry: Registry;

  constructor(
    private readonly orderMetrics: OrderMetrics,
    private readonly syncMetrics: SyncMetrics,
  ) {
    this.registry = new Registry();
    
    // 注册默认指标
    collectDefaultMetrics({ register: this.registry });
  }

  onModuleInit() {
    // 定期更新业务指标
    setInterval(() => {
      this.updateBusinessMetrics();
    }, 60000); // 每分钟更新
  }

  private async updateBusinessMetrics() {
    // 更新同步成功率
    const syncStats = await this.calculateSyncSuccessRate();
    this.syncMetrics.updateSuccessRate(syncStats);
  }

  private async calculateSyncSuccessRate(): Promise<number> {
    // 从数据库或缓存获取最近1小时的同步统计
    // 这里简化处理，实际应从 metrics 数据计算
    return 0.98; // 示例值
  }

  // 获取所有指标
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### 2.5 Metrics 控制器

```typescript
// metrics/metrics.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  }
}
```

---

## 3. 告警配置

### 3.1 服务器资源告警

```yaml
# 阿里云云监控告警规则
告警规则组: 服务器资源告警

规则1-CPU使用率:
  指标: CPUUtilization
  阈值: > 80%
  持续时间: 5分钟
  告警级别: 警告
  通知方式: 短信+邮件

规则2-内存使用率:
  指标: MemoryUtilization
  阈值: > 85%
  持续时间: 5分钟
  告警级别: 警告
  通知方式: 短信+邮件

规则3-磁盘使用率:
  指标: DiskUtilization
  阈值: > 90%
  持续时间: 5分钟
  告警级别: 严重
  通知方式: 短信+邮件+电话

规则4-网络入带宽:
  指标: InternetInRate
  阈值: > 100Mbps
  持续时间: 10分钟
  告警级别: 警告
  通知方式: 邮件

规则5-实例宕机:
  指标: StatusCheckFailed
  阈值: > 0
  持续时间: 1分钟
  告警级别: 严重
  通知方式: 短信+邮件+电话
```

### 3.2 应用异常告警

```yaml
告警规则组: 应用异常告警

规则1-应用错误率:
  指标: http_5xx_errors / http_total_requests
  阈值: > 1%
  持续时间: 2分钟
  告警级别: 严重
  通知方式: 短信+邮件+钉钉

规则2-API响应时间:
  指标: http_request_duration_seconds (p99)
  阈值: > 2s
  持续时间: 3分钟
  告警级别: 警告
  通知方式: 邮件+钉钉

规则3-应用内存使用:
  指标: nodejs_heap_size_used_bytes
  阈值: > 1GB
  持续时间: 5分钟
  告警级别: 警告
  通知方式: 邮件

规则4-活跃连接数:
  指标: nodejs_active_handles
  阈值: > 1000
  持续时间: 5分钟
  告警级别: 警告
  通知方式: 邮件

规则5-Event Loop延迟:
  指标: nodejs_eventloop_lag_seconds
  阈值: > 100ms
  持续时间: 2分钟
  告警级别: 严重
  通知方式: 短信+邮件
```

### 3.3 4portun 同步失败告警

```yaml
告警规则组: 4portun同步告警

规则1-同步失败次数:
  指标: fourportun_sync_total{result="failure"}
  阈值: > 10次/小时
  持续时间: 立即
  告警级别: 严重
  通知方式: 短信+邮件+钉钉

规则2-同步成功率:
  指标: fourportun_sync_success_rate
  阈值: < 95%
  持续时间: 10分钟
  告警级别: 警告
  通知方式: 邮件+钉钉

规则3-最后同步时间:
  指标: fourportun_last_sync_timestamp
  阈值: > 30分钟前
  持续时间: 立即
  告警级别: 严重
  通知方式: 短信+邮件+钉钉

规则4-同步耗时过长:
  指标: fourportun_sync_duration_seconds
  阈值: > 60s
  持续时间: 3次连续
  告警级别: 警告
  通知方式: 邮件
```

### 3.4 数据库告警

```yaml
告警规则组: 数据库告警

规则1-连接数使用率:
  指标: rds_connections_usage
  阈值: > 80%
  持续时间: 5分钟
  告警级别: 警告
  通知方式: 邮件+钉钉

规则2-慢查询数量:
  指标: rds_slow_queries
  阈值: > 100/小时
  持续时间: 立即
  告警级别: 警告
  通知方式: 邮件

规则3-主备延迟:
  指标: rds_replication_delay
  阈值: > 10s
  持续时间: 5分钟
  告警级别: 严重
  通知方式: 短信+邮件

规则4-磁盘空间:
  指标: rds_disk_usage
  阈值: > 85%
  持续时间: 5分钟
  告警级别: 严重
  通知方式: 短信+邮件+电话
```

### 3.5 告警通知模板

```javascript
// 钉钉告警消息模板
{
  "msgtype": "markdown",
  "markdown": {
    "title": "货运门户告警通知",
    "text": `## 🚨 货运门户告警

**告警名称**: {{alertName}}
**告警级别**: {{severity}}
**触发时间**: {{timestamp}}
**持续时间**: {{duration}}

**告警详情**:
- 指标: {{metricName}}
- 当前值: {{currentValue}}
- 阈值: {{threshold}}
- 实例: {{instanceId}}

**建议处理措施**:
{{suggestion}}

[查看详情]({{consoleUrl}})
`
  },
  "at": {
    "isAtAll": false,
    "atMobiles": ["13800138000"]
  }
}
```

---

## 4. 告警处理流程

```
┌─────────────┐
│   告警触发   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  通知发送    │ ──→ 短信/邮件/钉钉/电话
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  值班人员接收 │
└──────┬──────┘
       │
       ▼
┌─────────────┐     是    ┌─────────────┐
│  是否可自动恢复?│ ─────→ │  自动处理    │
└──────┬──────┘          └─────────────┘
       │ 否
       ▼
┌─────────────┐
│  人工介入处理 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  问题修复    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  告警关闭    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  复盘总结    │
└─────────────┘
```

---

## 5. 监控大盘配置

### 5.1 应用监控大盘

```yaml
大盘名称: 货运门户应用监控
刷新间隔: 30秒

图表1-请求量:
  类型: 折线图
  指标: http_requests_total
  维度: method, route
  时间范围: 1小时

图表2-响应时间:
  类型: 折线图
  指标: http_request_duration_seconds
  统计: p50, p95, p99
  时间范围: 1小时

图表3-错误率:
  类型: 饼图
  指标: http_requests_total
  维度: status_code
  过滤: status_code >= 500

图表4-业务指标:
  类型: 数字展示
  指标:
    - freight_orders_total
    - fourportun_sync_success_rate
    - nodejs_heap_size_used_bytes
```

### 5.2 业务监控大盘

```yaml
大盘名称: 货运门户业务监控
刷新间隔: 1分钟

图表1-今日订单:
  类型: 数字+趋势
  数据源: 数据库查询
  查询: SELECT COUNT(*) FROM shipments WHERE DATE(createdAt) = CURDATE()

图表2-订单状态分布:
  类型: 饼图
  数据源: 数据库查询
  查询: SELECT status, COUNT(*) FROM shipments GROUP BY status

图表3-同步成功率:
  类型: 仪表盘
  指标: fourportun_sync_success_rate
  阈值: 95%, 90%

图表4-活跃用户:
  类型: 折线图
  数据源: Redis
  指标: 在线用户数
```
