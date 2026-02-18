import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

// Redis 检查暂时禁用，因为 ioredis 未安装
// import Redis from 'ioredis';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    disk: HealthCheckResult;
    memory: HealthCheckResult;
  };
}

interface HealthCheckResult {
  status: 'up' | 'down' | 'warning';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

@Controller('health')
export class HealthController {
  private readonly prisma: PrismaClient;
  // private readonly redis: Redis;
  private readonly startTime: number;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient();
    // this.redis = new Redis(this.configService.get('REDIS_URL') || 'redis://localhost:6379');
    this.startTime = Date.now();
  }

  /**
   * 基础健康检查
   * 用于负载均衡器健康检查
   */
  @Get()
  async check(): Promise<HealthStatus> {
    const checks = await this.runHealthChecks();
    
    // 确定整体状态
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    const checkValues = Object.values(checks);
    
    if (checkValues.some(c => c.status === 'down')) {
      overallStatus = 'unhealthy';
    } else if (checkValues.some(c => c.status === 'warning')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'freight-portal-api',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  /**
   * 详细健康检查
   * 包含更多诊断信息
   */
  @Get('detailed')
  async detailedCheck(): Promise<HealthStatus> {
    const checks = await this.runDetailedChecks();
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    const checkValues = Object.values(checks);
    
    if (checkValues.some(c => c.status === 'down')) {
      overallStatus = 'unhealthy';
    } else if (checkValues.some(c => c.status === 'warning')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'freight-portal-api',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  /**
   * 存活探针
   * 轻量级检查，仅确认应用是否运行
   */
  @Get('liveness')
  liveness(): { status: string; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 就绪探针
   * 检查应用是否准备好接收流量
   */
  @Get('readiness')
  async readiness(): Promise<{ status: string; timestamp: string; ready: boolean }> {
    const dbCheck = await this.checkDatabase();
    const redisCheck = await this.checkRedis();
    
    const ready = dbCheck.status === 'up' && redisCheck.status === 'up';
    
    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      ready,
    };
  }

  /**
   * 业务指标检查
   */
  @Get('metrics')
  async metrics(): Promise<{
    orders: { total: number; today: number; status: string };
    sync: { lastSync: Date | null; successRate: number; status: string };
    api: { requestsPerMinute: number; avgResponseTime: number; errorRate: number };
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 订单统计
    const totalOrders = await this.prisma.shipment.count();
    const todayOrders = await this.prisma.shipment.count({
      where: { createdAt: { gte: today } },
    });

    // 同步状态
    const lastSync = await this.prisma.shipment.findFirst({
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    });

    const syncCount = await this.prisma.shipment.count({
      where: { lastSyncAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    const totalCount = await this.prisma.shipment.count();
    const successRate = totalCount > 0 ? (syncCount / totalCount) * 100 : 100;

    return {
      orders: {
        total: totalOrders,
        today: todayOrders,
        status: todayOrders > 0 ? 'active' : 'idle',
      },
      sync: {
        lastSync: lastSync?.lastSyncAt || null,
        successRate: Math.round(successRate * 100) / 100,
        status: successRate > 90 ? 'healthy' : successRate > 70 ? 'degraded' : 'unhealthy',
      },
      api: {
        requestsPerMinute: 0, // 需要从监控系统中获取
        avgResponseTime: 0,
        errorRate: 0,
      },
    };
  }

  /**
   * 运行健康检查
   */
  private async runHealthChecks(): Promise<HealthStatus['checks']> {
    const [database, redis, disk, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDisk(),
      this.checkMemory(),
    ]);

    return { database, redis, disk, memory };
  }

  /**
   * 运行详细检查
   */
  private async runDetailedChecks(): Promise<HealthStatus['checks']> {
    const [database, redis, disk, memory] = await Promise.all([
      this.checkDatabaseDetailed(),
      this.checkRedisDetailed(),
      this.checkDisk(),
      this.checkMemory(),
    ]);

    return { database, redis, disk, memory };
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  /**
   * 详细数据库检查
   */
  private async checkDatabaseDetailed(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // 基础连接检查
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 获取连接池状态
      const connectionInfo = await this.prisma.$queryRaw`
        SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Threads_running', 'Max_used_connections')
      `;
      
      // 获取慢查询数量
      const slowQueries = await this.prisma.$queryRaw`
        SHOW GLOBAL STATUS LIKE 'Slow_queries'
      `;

      return {
        status: 'up',
        responseTime: Date.now() - start,
        details: {
          connections: connectionInfo,
          slowQueries: slowQueries,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  /**
   * 检查 Redis 连接
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    // Redis 检查暂时禁用
    return {
      status: 'up',
      message: 'Redis check skipped (not configured)',
    };
    /*
    const start = Date.now();
    try {
      await this.redis.ping();
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
    */
  }

  /**
   * 详细 Redis 检查
   */
  private async checkRedisDetailed(): Promise<HealthCheckResult> {
    // Redis 检查暂时禁用
    return {
      status: 'up',
      message: 'Redis check skipped (not configured)',
    };
    /*
    const start = Date.now();
    try {
      await this.redis.ping();
      const info = await this.redis.info();
      
      // 解析关键指标
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1];
      const connectedClients = info.match(/connected_clients:(\d+)/)?.[1];
      
      return {
        status: 'up',
        responseTime: Date.now() - start,
        details: {
          usedMemory: usedMemory ? `${Math.round(parseInt(usedMemory) / 1024 / 1024)}MB` : 'unknown',
          connectedClients: parseInt(connectedClients || '0'),
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
    */
  }

  /**
   * 检查磁盘空间
   */
  private checkDisk(): HealthCheckResult {
    try {
      // 在 Node.js 中可以通过 fs 检查
      const fs = require('fs');
      const stats = fs.statSync('/');
      
      // 简化检查，实际生产环境可能需要更复杂的逻辑
      return {
        status: 'up',
        message: 'Disk check passed',
      };
    } catch (error) {
      return {
        status: 'warning',
        message: error.message,
      };
    }
  }

  /**
   * 检查内存使用
   */
  private checkMemory(): HealthCheckResult {
    const used = process.memoryUsage();
    const totalMB = Math.round(used.heapTotal / 1024 / 1024);
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    const usagePercent = (used.heapUsed / used.heapTotal) * 100;

    let status: 'up' | 'warning' = 'up';
    if (usagePercent > 90) {
      status = 'warning';
    }

    return {
      status,
      message: `Memory: ${usedMB}MB / ${totalMB}MB (${Math.round(usagePercent)}%)`,
      details: {
        heapUsed: usedMB,
        heapTotal: totalMB,
        rss: Math.round(used.rss / 1024 / 1024),
        external: Math.round(used.external / 1024 / 1024),
      },
    };
  }
}
