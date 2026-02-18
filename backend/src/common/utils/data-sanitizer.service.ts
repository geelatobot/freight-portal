import { Injectable } from '@nestjs/common';

/**
 * 数据脱敏服务
 * 用于清理敏感信息
 */
@Injectable()
export class DataSanitizerService {
  /**
   * 清理用户敏感信息
   * 移除 passwordHash 等敏感字段
   */
  sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * 清理多个用户
   */
  sanitizeUsers<T extends Record<string, any>>(users: T[]): Omit<T, 'passwordHash'>[] {
    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * 脱敏手机号
   * 13800138000 -> 138****8000
   */
  maskPhone(phone: string | null | undefined): string | null {
    if (!phone || phone.length < 7) return phone ?? null;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 脱敏邮箱
   * test@example.com -> t***@example.com
   */
  maskEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = localPart.charAt(0) + '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * 脱敏身份证号
   * 110101199001011234 -> 110101********1234
   */
  maskIdCard(idCard: string | null | undefined): string | null {
    if (!idCard || idCard.length < 8) return idCard ?? null;
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }

  /**
   * 脱敏银行卡号
   * 6222021234567890123 -> 622202********0123
   */
  maskBankCard(cardNo: string | null | undefined): string | null {
    if (!cardNo || cardNo.length < 8) return cardNo ?? null;
    const length = cardNo.length;
    const prefix = cardNo.slice(0, 6);
    const suffix = cardNo.slice(-4);
    return `${prefix}${'*'.repeat(length - 10)}${suffix}`;
  }

  /**
   * 移除对象中的指定字段
   */
  omit<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[],
  ): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  }

  /**
   * 只保留对象中的指定字段
   */
  pick<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[],
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  }
}
