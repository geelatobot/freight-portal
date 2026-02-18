/**
 * 任务 1.1.1 & 2.2: 统一错误处理与日志系统 - NestJS Winston Logger 服务
 * 提供 NestJS 兼容的 Logger 服务
 */

import { Injectable, LoggerService, LogLevel, Optional } from '@nestjs/common';
import { Logger } from 'winston';
import { createWinstonLogger } from './winston.config';
import { DataSanitizerService } from '../services/data-sanitizer.service';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: Logger;
  private context?: string;

  constructor(
    @Optional() logLevel?: string,
    private readonly sanitizer?: DataSanitizerService,
  ) {
    this.logger = createWinstonLogger(logLevel || 'info');
  }

  /**
   * 设置日志上下文
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 日志级别: debug
   */
  debug(message: any, ...optionalParams: any[]): void {
    this.logWithLevel('debug', message, ...optionalParams);
  }

  /**
   * 日志级别: verbose
   */
  verbose(message: any, ...optionalParams: any[]): void {
    this.logWithLevel('verbose', message, ...optionalParams);
  }

  /**
   * 日志级别: log (info)
   */
  log(message: any, ...optionalParams: any[]): void {
    this.logWithLevel('info', message, ...optionalParams);
  }

  /**
   * 日志级别: warn
   */
  warn(message: any, ...optionalParams: any[]): void {
    this.logWithLevel('warn', message, ...optionalParams);
  }

  /**
   * 日志级别: error
   */
  error(message: any, ...optionalParams: any[]): void {
    const [trace, ...rest] = optionalParams;
    this.logWithLevel('error', message, trace, ...rest);
  }

  /**
   * 设置日志级别
   */
  setLogLevels(levels: LogLevel[]): void {
    // Winston 会自动处理日志级别
    this.logger.level = levels[0] || 'info';
  }

  /**
   * 统一的日志处理方法
   */
  private logWithLevel(level: string, message: any, ...optionalParams: any[]): void {
    const meta: Record<string, any> = {};
    
    if (this.context) {
      meta.context = this.context;
    }

    // 处理可选参数
    optionalParams.forEach((param, index) => {
      if (typeof param === 'object' && param !== null) {
        meta[`param${index}`] = this.sanitizeData(param);
      } else if (param !== undefined) {
        meta[`param${index}`] = param;
      }
    });

    // 处理消息
    if (typeof message === 'object' && message !== null) {
      this.logger.log(level, 'Object logged', { ...meta, data: this.sanitizeData(message) });
    } else {
      this.logger.log(level, message, meta);
    }
  }

  /**
   * 脱敏数据
   */
  private sanitizeData(data: any): any {
    if (this.sanitizer) {
      return this.sanitizer.sanitize(data);
    }
    // 如果没有注入 sanitizer，使用简单的脱敏逻辑
    return this.basicSanitize(data);
  }

  /**
   * 基础脱敏逻辑（作为后备）
   */
  private basicSanitize(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.basicSanitize(item));
    }

    const sensitiveFields = [
      'password', 'passwordHash', 'token', 'accessToken', 'refreshToken',
      'secret', 'apiKey', 'authorization', 'phone', 'idCard',
    ];

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        if (typeof value === 'string') {
          sanitized[key] = value.length <= 4 ? '****' : value.slice(0, 2) + '****' + value.slice(-2);
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.basicSanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * 记录 HTTP 请求日志
   */
  logRequest(req: any, res: any, duration: number): void {
    const logData = {
      method: req.method,
      path: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
      companyId: req.user?.companyId,
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(level, `HTTP ${req.method} ${req.url}`, logData);
  }

  /**
   * 记录业务操作日志
   */
  logBusiness(action: string, data: any, userId?: string): void {
    this.logger.info(`Business Action: ${action}`, {
      action,
      userId,
      data: this.sanitizeData(data),
    });
  }

  /**
   * 记录外部 API 调用日志
   */
  logExternalApi(service: string, method: string, url: string, data?: any): void {
    this.logger.info(`External API Call: ${service}`, {
      service,
      method,
      url,
      data: this.sanitizeData(data),
    });
  }
}
