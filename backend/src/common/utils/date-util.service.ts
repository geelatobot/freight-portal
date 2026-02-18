import { Injectable } from '@nestjs/common';

/**
 * 日期工具服务
 * 提供常用的日期处理功能
 */
@Injectable()
export class DateUtilService {
  /**
   * 将字符串或日期对象转换为 Date 对象
   */
  parseDate(date: string | Date | null | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    return new Date(date);
  }

  /**
   * 将日期格式化为 YYYY-MM-DD 格式
   */
  formatDate(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 将日期格式化为 YYYY-MM-DD HH:mm:ss 格式
   */
  formatDateTime(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    const dateStr = this.formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 获取当前日期时间
   */
  now(): Date {
    return new Date();
  }

  /**
   * 获取今天的开始时间（00:00:00）
   */
  startOfDay(date?: Date | string): Date {
    const d = date ? (date instanceof Date ? date : new Date(date)) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * 获取今天的结束时间（23:59:59）
   */
  endOfDay(date?: Date | string): Date {
    const d = date ? (date instanceof Date ? date : new Date(date)) : new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * 添加天数
   */
  addDays(date: Date | string, days: number): Date {
    const d = date instanceof Date ? new Date(date) : new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * 添加月份
   */
  addMonths(date: Date | string, months: number): Date {
    const d = date instanceof Date ? new Date(date) : new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  /**
   * 检查日期是否过期
   */
  isExpired(date: Date | string | null | undefined): boolean {
    if (!date) return false;
    const d = date instanceof Date ? date : new Date(date);
    return d.getTime() < Date.now();
  }

  /**
   * 计算两个日期之间的天数差
   */
  diffInDays(date1: Date | string, date2: Date | string): number {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 检查日期是否在范围内
   */
  isBetween(
    date: Date | string,
    startDate: Date | string,
    endDate: Date | string,
  ): boolean {
    const d = date instanceof Date ? date.getTime() : new Date(date).getTime();
    const start = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
    const end = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
    return d >= start && d <= end;
  }
}
