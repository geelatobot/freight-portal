# 货运门户日志系统配置指南

## 1. 阿里云 SLS 接入

### 1.1 创建日志项目

```yaml
项目配置:
  项目名称: freight-portal-prod
  所属区域: 华东1（杭州）
  描述: 货运门户生产环境日志

日志库配置:
  应用日志 (app-logs):
    数据保存时间: 30天
    Shard数量: 2
    自动分裂: 启用
    
  访问日志 (access-logs):
    数据保存时间: 7天
    Shard数量: 2
    
  错误日志 (error-logs):
    数据保存时间: 90天
    Shard数量: 2
    
  审计日志 (audit-logs):
    数据保存时间: 180天
    Shard数量: 1
```

### 1.2 安装 SLS Node.js SDK

```bash
npm install @alicloud/log --save
```

### 1.3 日志服务配置

```typescript
// common/logger/sls.logger.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Core from '@alicloud/pop-core';

interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  context?: Record<string, any>;
  traceId?: string;
  userId?: string;
  ip?: string;
}

@Injectable()
export class SlsLogger {
  private client: Core;
  private project: string;
  private logstore: string;
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.project = this.configService.get('SLS_PROJECT');
    this.logstore = this.configService.get('SLS_LOGSTORE');

    this.client = new Core({
      accessKeyId: this.configService.get('SLS_ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get('SLS_ACCESS_KEY_SECRET'),
      endpoint: `https://${this.configService.get('SLS_ENDPOINT')}`,
      apiVersion: '2020-12-30',
    });

    // 定期批量发送日志
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  log(entry: LogEntry) {
    this.buffer.push(entry);
    
    // 缓冲区达到100条时立即发送
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const params = {
        ProjectName: this.project,
        LogStoreName: this.logstore,
        LogGroup: {
          Logs: logs.map(log => ({
            Time: Math.floor(log.timestamp / 1000),
            Contents: Object.entries(log).map(([key, value]) => ({
              Key: key,
              Value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            })),
          })),
        },
      };

      await this.client.request('PutLogs', params, { method: 'POST' });
    } catch (error) {
      console.error('Failed to send logs to SLS:', error);
      // 发送失败时保留日志到本地
      this.buffer.unshift(...logs);
    }
  }

  onModuleDestroy() {
    clearInterval(this.flushInterval);
    this.flush();
  }
}
```

### 1.4 Winston SLS Transport

```typescript
// common/logger/winston-sls.transport.ts
import Transport from 'winston-transport';
import { SlsLogger } from './sls.logger';

interface SlsTransportOptions extends Transport.TransportStreamOptions {
  slsLogger: SlsLogger;
}

export class WinstonSlsTransport extends Transport {
  private slsLogger: SlsLogger;

  constructor(options: SlsTransportOptions) {
    super(options);
    this.slsLogger = options.slsLogger;
  }

  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info));

    this.slsLogger.log({
      timestamp: Date.now(),
      level: info.level,
      message: info.message,
      context: info.context,
      traceId: info.traceId,
      userId: info.userId,
      ip: info.ip,
    });

    callback();
  }
}
```

### 1.5 统一日志服务

```typescript
// common/logger/logger.service.ts
import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, transports, Logger } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { SlsLogger } from './sls.logger';
import { WinstonSlsTransport } from './winston-sls.transport';
import { AsyncLocalStorage } from 'async_hooks';

// 用于存储请求上下文
export const asyncLocalStorage = new AsyncLocalStorage<{
  traceId: string;
  userId?: string;
  ip?: string;
}>();

@Injectable()
export class AppLogger implements LoggerService {
  private logger: Logger;
  private context?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly slsLogger: SlsLogger,
  ) {
    this.logger = this.createLogger();
  }

  private createLogger(): Logger {
    const logLevel = this.configService.get('LOG_LEVEL', 'info');
    const logPath = this.configService.get('LOG_PATH', './logs');
    const enableSls = !!this.configService.get('SLS_PROJECT');

    const logTransports: transports.ConsoleTransportInstance[] = [
      new transports.Console({
        format: format.combine(
          format.timestamp(),
          format.colorize(),
          format.printf(({ timestamp, level, message, context }) => {
            const ctx = context ? ` [${JSON.stringify(context)}]` : '';
            return `${timestamp} [${level}]: ${message}${ctx}`;
          }),
        ),
      }),
    ];

    const fileTransports = [
      // 应用日志
      new DailyRotateFile({
        filename: `${logPath}/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '100m',
        maxFiles: '30d',
        format: format.combine(format.timestamp(), format.json()),
      }),
      // 错误日志
      new DailyRotateFile({
        filename: `${logPath}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '100m',
        maxFiles: '90d',
        level: 'error',
        format: format.combine(format.timestamp(), format.json()),
      }),
    ];

    const allTransports: any[] = [...logTransports, ...fileTransports];

    // 添加 SLS 传输
    if (enableSls) {
      allTransports.push(
        new WinstonSlsTransport({
          slsLogger: this.slsLogger,
        }),
      );
    }

    return createLogger({
      level: logLevel,
      defaultMeta: { service: 'freight-portal-api' },
      transports: allTransports,
      exitOnError: false,
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  private getMeta() {
    const store = asyncLocalStorage.getStore();
    return {
      context: this.context,
      traceId: store?.traceId,
      userId: store?.userId,
      ip: store?.ip,
    };
  }

  log(message: string, context?: Record<string, any>) {
    this.logger.info(message, { ...this.getMeta(), ...context });
  }

  error(message: string, trace?: string, context?: Record<string, any>) {
    this.logger.error(message, { ...this.getMeta(), trace, ...context });
  }

  warn(message: string, context?: Record<string, any>) {
    this.logger.warn(message, { ...this.getMeta(), ...context });
  }

  debug(message: string, context?: Record<string, any>) {
    this.logger.debug(message, { ...this.getMeta(), ...context });
  }

  verbose(message: string, context?: Record<string, any>) {
    this.logger.verbose(message, { ...this.getMeta(), ...context });
  }
}
```

### 1.6 日志中间件

```typescript
// common/middleware/logging.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppLogger, asyncLocalStorage } from '../logger/logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const startTime = Date.now();

    // 设置响应头
    res.setHeader('X-Trace-Id', traceId);

    // 存储上下文
    const store = {
      traceId,
      userId: (req as any).user?.id,
      ip: req.ip,
    };

    asyncLocalStorage.run(store, () => {
      // 记录请求开始
      this.logger.log(`Request started: ${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? 'warn' : 'log';

        this.logger[level](`Request completed: ${req.method} ${req.path}`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length'),
        });
      });

      next();
    });
  }
}
```

---

## 2. 日志查询仪表盘配置

### 2.1 快速查询配置

```sql
-- 查询今日错误
level: error and timestamp > @today

-- 查询特定用户操作
userId: "12345" and timestamp > @today

-- 查询慢请求
duration > 2000 and timestamp > @today

-- 查询特定Trace
traceId: "abc-def-ghi"

-- 查询API错误
path: "/api/v1/shipments/*" and statusCode >= 500

-- 查询登录失败
path: "/api/v1/auth/login" and statusCode: 401

-- 查询4portun同步错误
message: "4portun" and level: error
```

### 2.2 仪表盘配置

```yaml
仪表盘名称: 货运门户日志分析
刷新间隔: 1分钟
时间范围: 最近1小时

图表1-日志级别分布:
  类型: 饼图
  查询: |
    * | select level, count(*) as count 
    group by level
  展示: 最近1小时

图表2-错误趋势:
  类型: 折线图
  查询: |
    level: error | select 
    date_trunc('minute', timestamp) as time,
    count(*) as error_count
    group by time
    order by time
  时间范围: 最近24小时

图表3-Top 10 API路径:
  类型: 柱状图
  查询: |
    * | select 
    path,
    count(*) as request_count,
    avg(duration) as avg_duration
    group by path
    order by request_count desc
    limit 10

图表4-状态码分布:
  类型: 饼图
  查询: |
    * | select 
    case 
      when statusCode < 200 then '1xx'
      when statusCode < 300 then '2xx'
      when statusCode < 400 then '3xx'
      when statusCode < 500 then '4xx'
      else '5xx'
    end as status_group,
    count(*) as count
    group by status_group

图表5-响应时间分布:
  类型: 热力图
  查询: |
    * | select 
    path,
    case 
      when duration < 100 then '0-100ms'
      when duration < 500 then '100-500ms'
      when duration < 1000 then '500ms-1s'
      when duration < 2000 then '1-2s'
      else '>2s'
    end as duration_range,
    count(*) as count
    group by path, duration_range

图表6-实时日志流:
  类型: 日志流
  查询: * | order by timestamp desc
  自动刷新: 5秒
  显示条数: 50
```

### 2.3 告警查询配置

```sql
-- 错误率告警查询
* | select 
  count(case when level = 'error' then 1 end) * 100.0 / count(*) as error_rate
  where timestamp > now() - interval 5 minute

-- 慢查询告警
* | select count(*) as slow_count 
  where duration > 2000 and timestamp > now() - interval 5 minute

-- 特定错误模式
message: "ECONNREFUSED" or message: "Timeout" 
  and timestamp > now() - interval 5 minute

-- 异常流量检测
* | select 
  count(*) as request_count,
  count(distinct ip) as unique_ips
  where timestamp > now() - interval 5 minute
```

---

## 3. 日志规范

### 3.1 日志级别定义

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| ERROR | 系统错误，需要立即处理 | 数据库连接失败、API调用异常 |
| WARN | 警告信息，需要关注 | 请求参数异常、资源即将耗尽 |
| INFO | 正常业务信息 | 用户登录、订单创建 |
| DEBUG | 调试信息 | 详细的执行流程、变量值 |
| VERBOSE | 最详细的跟踪信息 | 完整的请求/响应内容 |

### 3.2 日志格式规范

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Order created successfully",
  "service": "freight-portal-api",
  "context": "OrderService",
  "traceId": "abc-123-def",
  "userId": "user-456",
  "ip": "192.168.1.100",
  "metadata": {
    "orderId": "ORD-20240115-001",
    "containerNo": "MSCU1234567",
    "amount": 1500.00,
    "currency": "USD"
  }
}
```

### 3.3 敏感信息处理

```typescript
// common/logger/sanitizer.ts
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'creditCard',
  'idCard',
  'phone',
];

export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}
```

---

## 4. 日志分析场景

### 4.1 故障排查流程

```
1. 发现问题
   ↓
2. 查看错误日志仪表盘
   - 筛选时间范围
   - 按错误类型分组
   ↓
3. 定位具体错误
   - 点击错误查看详情
   - 获取 traceId
   ↓
4. 追踪请求链路
   - 使用 traceId 查询所有相关日志
   - 查看请求完整生命周期
   ↓
5. 分析根因
   - 查看错误堆栈
   - 检查上下文信息
   ↓
6. 解决问题
```

### 4.2 常用分析查询

```sql
-- 分析特定时间段内的错误
level: error 
  and timestamp >= '2024-01-15 00:00:00' 
  and timestamp < '2024-01-16 00:00:00'
| select 
    message,
    count(*) as count,
    count(distinct traceId) as affected_requests
  group by message
  order by count desc

-- 分析API性能
* 
| select 
    path,
    count(*) as total_requests,
    avg(duration) as avg_duration,
    percentile(duration, 95) as p95_duration,
    percentile(duration, 99) as p99_duration,
    count(case when statusCode >= 500 then 1 end) as error_count
  group by path
  order by total_requests desc

-- 用户行为分析
userId: * 
| select 
    userId,
    count(*) as action_count,
    count(distinct path) as unique_paths,
    min(timestamp) as first_action,
    max(timestamp) as last_action
  group by userId
  order by action_count desc
  limit 100
```
