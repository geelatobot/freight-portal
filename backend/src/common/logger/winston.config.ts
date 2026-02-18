/**
 * 任务 1.1.1: 统一错误处理与日志系统 - Winston 日志配置
 * 集成 Winston 日志系统，支持分级和按日期分割
 */

import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

/**
 * 敏感字段列表
 * 这些字段在日志中会被脱敏处理
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'api_key',
  'appSecret',
  'authorization',
  'phone',
  'mobile',
  'idCard',
  'id_card',
  'creditCard',
  'credit_card',
  'bankAccount',
  'bank_account',
];

/**
 * 脱敏处理函数
 * 对敏感字段进行脱敏处理
 */
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      // 根据值类型进行脱敏
      if (typeof value === 'string') {
        if (value.length <= 4) {
          sanitized[key] = '****';
        } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
          // 手机号脱敏：保留前3位和后4位
          sanitized[key] = value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        } else if (key.toLowerCase().includes('email')) {
          // 邮箱脱敏：保留前2位和@后面的域名
          sanitized[key] = value.replace(/(.{2}).+(@.+)/, '$1***$2');
        } else {
          // 其他敏感字段：保留前2位和后2位
          sanitized[key] = value.slice(0, 2) + '****' + value.slice(-2);
        }
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * 创建 Winston Logger 实例
 */
export const createWinstonLogger = (logLevel: string = 'info'): Logger => {
  const logsDir = join(process.cwd(), 'logs');

  // 控制台输出格式（带颜色）
  const consoleFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.colorize({ all: true }),
    format.printf(({ level, message, timestamp, context, ...metadata }) => {
      let msg = `${timestamp} [${level}]${context ? ` [${context}]` : ''}: ${message}`;
      if (Object.keys(metadata).length > 0) {
        const sanitizedMetadata = sanitizeData(metadata);
        msg += ` ${JSON.stringify(sanitizedMetadata)}`;
      }
      return msg;
    }),
  );

  // 文件输出格式（不带颜色）
  const fileFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ level, message, timestamp, context, ...metadata }) => {
      let msg = `${timestamp} [${level.toUpperCase()}]${context ? ` [${context}]` : ''}: ${message}`;
      if (Object.keys(metadata).length > 0) {
        const sanitizedMetadata = sanitizeData(metadata);
        msg += ` ${JSON.stringify(sanitizedMetadata)}`;
      }
      return msg;
    }),
  );

  // 按日期分割的日志文件配置
  const dailyRotateFileTransport = new DailyRotateFile({
    filename: join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    level: logLevel,
  });

  // 错误日志单独存储
  const errorRotateFileTransport = new DailyRotateFile({
    filename: join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    level: 'error',
  });

  // 创建 Logger 实例
  const logger = createLogger({
    level: logLevel,
    defaultMeta: { service: 'freight-portal' },
    transports: [
      // 控制台输出
      new transports.Console({
        format: consoleFormat,
      }),
      // 所有日志文件
      dailyRotateFileTransport,
      // 错误日志文件
      errorRotateFileTransport,
    ],
    // 未捕获的异常处理
    exceptionHandlers: [
      new DailyRotateFile({
        filename: join(logsDir, 'exceptions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        format: fileFormat,
      }),
    ],
    // Promise 拒绝处理
    rejectionHandlers: [
      new DailyRotateFile({
        filename: join(logsDir, 'rejections-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        format: fileFormat,
      }),
    ],
  });

  return logger;
};

// 导出脱敏函数供其他模块使用
export { sanitizeData, SENSITIVE_FIELDS };
