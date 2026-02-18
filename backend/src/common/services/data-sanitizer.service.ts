/**
 * 任务 2.2: 数据脱敏服务
 * 统一处理敏感数据脱敏
 */

import { Injectable } from '@nestjs/common';

/**
 * 敏感字段列表
 * 这些字段在日志和数据输出中会被脱敏处理
 */
export const SENSITIVE_FIELDS = [
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

@Injectable()
export class DataSanitizerService {
  /**
   * 敏感字段列表（可自定义扩展）
   */
  private sensitiveFields: string[] = [...SENSITIVE_FIELDS];

  /**
   * 添加自定义敏感字段
   * @param fields 敏感字段名数组
   */
  addSensitiveFields(fields: string[]): void {
    this.sensitiveFields.push(...fields);
  }

  /**
   * 设置敏感字段列表（覆盖默认）
   * @param fields 敏感字段名数组
   */
  setSensitiveFields(fields: string[]): void {
    this.sensitiveFields = fields;
  }

  /**
   * 通用数据脱敏处理
   * 对对象中的敏感字段进行脱敏处理
   * @param data 需要脱敏的数据
   * @returns 脱敏后的数据
   */
  sanitize<T>(data: T): T {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item)) as unknown as T;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.maskValue(key, value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * 用户数据脱敏
   * 移除用户对象中的敏感字段（如 passwordHash）
   * @param user 用户对象
   * @returns 脱敏后的用户对象
   */
  sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash'> {
    if (!user || typeof user !== 'object') {
      return user;
    }

    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * 手机号脱敏
   * 格式: 138****8000
   * @param phone 手机号
   * @returns 脱敏后的手机号
   */
  maskPhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return phone;
    }
    // 保留前3位和后4位，中间用****代替
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 邮箱脱敏
   * 格式: ab***@example.com
   * @param email 邮箱地址
   * @returns 脱敏后的邮箱
   */
  maskEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return email;
    }
    // 保留前2位和@后面的域名
    return email.replace(/(.{2}).+(@.+)/, '$1***$2');
  }

  /**
   * 身份证号脱敏
   * 格式: 110101********1234
   * @param idCard 身份证号
   * @returns 脱敏后的身份证号
   */
  maskIdCard(idCard: string): string {
    if (!idCard || typeof idCard !== 'string') {
      return idCard;
    }
    if (idCard.length === 18) {
      return idCard.replace(/(\d{6})\d{10}(\d{2})/, '$1**********$2');
    }
    if (idCard.length === 15) {
      return idCard.replace(/(\d{6})\d{6}(\d{3})/, '$1******$2');
    }
    return idCard;
  }

  /**
   * 银行卡号脱敏
   * 格式: **** **** **** 1234
   * @param cardNo 银行卡号
   * @returns 脱敏后的银行卡号
   */
  maskBankCard(cardNo: string): string {
    if (!cardNo || typeof cardNo !== 'string') {
      return cardNo;
    }
    // 保留后4位
    return cardNo.replace(/\d(?=\d{4})/g, '*');
  }

  /**
   * 姓名脱敏
   * 格式: 张**
   * @param name 姓名
   * @returns 脱敏后的姓名
   */
  maskName(name: string): string {
    if (!name || typeof name !== 'string') {
      return name;
    }
    if (name.length <= 1) {
      return name;
    }
    if (name.length === 2) {
      return name.charAt(0) + '*';
    }
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
  }

  /**
   * 通用字符串脱敏
   * 保留前n位和后m位，中间用*代替
   * @param str 原字符串
   * @param start 保留前几位
   * @param end 保留后几位
   * @returns 脱敏后的字符串
   */
  maskString(str: string, start = 2, end = 2): string {
    if (!str || typeof str !== 'string') {
      return str;
    }
    if (str.length <= start + end) {
      return str;
    }
    const prefix = str.slice(0, start);
    const suffix = str.slice(-end);
    const masked = '*'.repeat(Math.min(str.length - start - end, 8));
    return `${prefix}${masked}${suffix}`;
  }

  /**
   * 日志敏感信息过滤
   * 对日志数据进行脱敏处理
   * @param data 日志数据
   * @returns 脱敏后的数据
   */
  sanitizeForLogging<T>(data: T): T {
    return this.sanitize(data);
  }

  /**
   * 检查字段是否为敏感字段
   * @param fieldName 字段名
   * @returns 是否为敏感字段
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.sensitiveFields.some(field => 
      lowerFieldName.includes(field.toLowerCase())
    );
  }

  /**
   * 根据字段类型对值进行脱敏
   * @param key 字段名
   * @param value 字段值
   * @returns 脱敏后的值
   */
  private maskValue(key: string, value: any): any {
    if (typeof value !== 'string') {
      return '[REDACTED]';
    }

    const lowerKey = key.toLowerCase();

    // 手机号脱敏
    if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
      return this.maskPhone(value);
    }

    // 邮箱脱敏
    if (lowerKey.includes('email')) {
      return this.maskEmail(value);
    }

    // 身份证号脱敏
    if (lowerKey.includes('idcard') || lowerKey.includes('id_card')) {
      return this.maskIdCard(value);
    }

    // 银行卡号脱敏
    if (lowerKey.includes('creditcard') || lowerKey.includes('credit_card') || 
        lowerKey.includes('bankaccount') || lowerKey.includes('bank_account')) {
      return this.maskBankCard(value);
    }

    // 短字符串完全脱敏
    if (value.length <= 4) {
      return '****';
    }

    // 默认脱敏：保留前2位和后2位
    return value.slice(0, 2) + '****' + value.slice(-2);
  }
}
