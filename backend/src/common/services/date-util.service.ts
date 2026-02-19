/**
 * 任务 2.3: 日期工具服务
 * 统一处理日期格式化、时区转换、日期计算等
 */

import { Injectable } from '@nestjs/common';

export type DateFormat = 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' | 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM-DD-YYYY' | 'ISO' | 'TIMESTAMP';

export interface DateDiffResult {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
}

@Injectable()
export class DateUtilService {
  /**
   * 默认时区（中国标准时间）
   */
  private defaultTimezone = 'Asia/Shanghai';

  /**
   * 设置默认时区
   * @param timezone 时区名称，如 'Asia/Shanghai'
   */
  setDefaultTimezone(timezone: string): void {
    this.defaultTimezone = timezone;
  }

  /**
   * 日期格式化
   * @param date 日期对象或字符串
   * @param format 格式模板
   * @returns 格式化后的日期字符串
   */
  format(date: Date | string | number, format: DateFormat = 'YYYY-MM-DD HH:mm:ss'): string {
    const d = this.toDate(date);
    
    if (format === 'ISO') {
      return d.toISOString();
    }
    
    if (format === 'TIMESTAMP') {
      return d.getTime().toString();
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }

  /**
   * 解析日期字符串为 Date 对象
   * @param dateStr 日期字符串
   * @returns Date 对象
   */
  parse(dateStr: string): Date {
    const timestamp = Date.parse(dateStr);
    if (isNaN(timestamp)) {
      throw new Error(`Invalid date string: ${dateStr}`);
    }
    return new Date(timestamp);
  }

  /**
   * 转换为 Date 对象
   * @param date 日期对象、字符串或时间戳
   * @returns Date 对象
   */
  toDate(date: Date | string | number): Date {
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === 'string') {
      return this.parse(date);
    }
    if (typeof date === 'number') {
      return new Date(date);
    }
    throw new Error(`Invalid date input: ${date}`);
  }

  /**
   * 时区转换
   * @param date 日期对象或字符串
   * @param targetTimezone 目标时区
   * @returns 转换后的 Date 对象
   */
  convertTimezone(date: Date | string | number, targetTimezone: string): Date {
    const d = this.toDate(date);
    
    // 使用 Intl.DateTimeFormat 进行时区转换
    const options: Intl.DateTimeFormatOptions = {
      timeZone: targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * 获取当前时间（指定时区）
   * @param timezone 时区，默认使用默认时区
   * @returns Date 对象
   */
  now(timezone?: string): Date {
    const tz = timezone || this.defaultTimezone;
    return this.convertTimezone(new Date(), tz);
  }

  /**
   * 计算两个日期之间的差值
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 日期差值结果
   */
  diff(startDate: Date | string | number, endDate: Date | string | number): DateDiffResult {
    const start = this.toDate(startDate).getTime();
    const end = this.toDate(endDate).getTime();
    
    const diffMs = end - start;
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    // 计算年月日时分秒
    const startD = this.toDate(startDate);
    const endD = this.toDate(endDate);

    let years = endD.getFullYear() - startD.getFullYear();
    let months = endD.getMonth() - startD.getMonth();
    let days = endD.getDate() - startD.getDate();

    if (days < 0) {
      months--;
      // 获取上一个月的天数
      const lastMonth = new Date(endD.getFullYear(), endD.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return {
      years,
      months,
      days,
      hours,
      minutes,
      seconds,
      totalDays,
      totalHours,
      totalMinutes,
      totalSeconds,
    };
  }

  /**
   * 判断日期是否过期
   * @param date 待检查的日期
   * @param referenceDate 参考日期（默认为当前时间）
   * @returns 是否已过期
   */
  isExpired(date: Date | string | number, referenceDate?: Date | string | number): boolean {
    const checkDate = this.toDate(date).getTime();
    const refDate = referenceDate ? this.toDate(referenceDate).getTime() : Date.now();
    return checkDate < refDate;
  }

  /**
   * 判断日期是否在有效期内
   * @param date 待检查的日期
   * @param referenceDate 参考日期（默认为当前时间）
   * @returns 是否在有效期内
   */
  isValid(date: Date | string | number, referenceDate?: Date | string | number): boolean {
    return !this.isExpired(date, referenceDate);
  }

  /**
   * 添加天数
   * @param date 原日期
   * @param days 要添加的天数（可为负数）
   * @returns 新的 Date 对象
   */
  addDays(date: Date | string | number, days: number): Date {
    const d = this.toDate(date);
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 添加小时
   * @param date 原日期
   * @param hours 要添加的小时数（可为负数）
   * @returns 新的 Date 对象
   */
  addHours(date: Date | string | number, hours: number): Date {
    const d = this.toDate(date);
    const result = new Date(d);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * 添加分钟
   * @param date 原日期
   * @param minutes 要添加的分钟数（可为负数）
   * @returns 新的 Date 对象
   */
  addMinutes(date: Date | string | number, minutes: number): Date {
    const d = this.toDate(date);
    const result = new Date(d);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * 添加月份
   * @param date 原日期
   * @param months 要添加的月份数（可为负数）
   * @returns 新的 Date 对象
   */
  addMonths(date: Date | string | number, months: number): Date {
    const d = this.toDate(date);
    const result = new Date(d);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * 添加年份
   * @param date 原日期
   * @param years 要添加的年份数（可为负数）
   * @returns 新的 Date 对象
   */
  addYears(date: Date | string | number, years: number): Date {
    const d = this.toDate(date);
    const result = new Date(d);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * 获取日期开始时间（00:00:00）
   * @param date 日期
   * @returns 当天的开始时间
   */
  startOfDay(date: Date | string | number): Date {
    const d = this.toDate(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  /**
   * 获取日期结束时间（23:59:59）
   * @param date 日期
   * @returns 当天的结束时间
   */
  endOfDay(date: Date | string | number): Date {
    const d = this.toDate(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  /**
   * 获取月份开始时间
   * @param date 日期
   * @returns 当月的开始时间
   */
  startOfMonth(date: Date | string | number): Date {
    const d = this.toDate(date);
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  }

  /**
   * 获取月份结束时间
   * @param date 日期
   * @returns 当月的结束时间
   */
  endOfMonth(date: Date | string | number): Date {
    const d = this.toDate(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * 判断是否为同一天
   * @param date1 日期1
   * @param date2 日期2
   * @returns 是否为同一天
   */
  isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
    const d1 = this.toDate(date1);
    const d2 = this.toDate(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * 判断是否为闰年
   * @param date 日期
   * @returns 是否为闰年
   */
  isLeapYear(date: Date | string | number): boolean {
    const year = this.toDate(date).getFullYear();
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * 获取当前时间戳
   * @returns 时间戳（毫秒）
   */
  getTimestamp(): number {
    return Date.now();
  }

  /**
   * 格式化相对时间（如：3天前、刚刚）
   * @param date 日期
   * @returns 相对时间字符串
   */
  formatRelative(date: Date | string | number): string {
    const d = this.toDate(date);
    const now = new Date();
    const diff = this.diff(d, now);

    if (diff.totalSeconds < 60) {
      return '刚刚';
    }
    if (diff.totalMinutes < 60) {
      return `${diff.totalMinutes}分钟前`;
    }
    if (diff.totalHours < 24) {
      return `${diff.totalHours}小时前`;
    }
    if (diff.totalDays < 30) {
      return `${diff.totalDays}天前`;
    }
    if (diff.months < 12) {
      return `${diff.months}个月前`;
    }
    return `${diff.years}年前`;
  }
}
