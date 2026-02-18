/**
 * 任务 2.1: 通用编号生成服务
 * 统一生成订单号、账单号、发票号、货物号等
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class CodeGeneratorService {
  /**
   * 生成订单号: ORD + 年月日 + 4位随机数
   * 示例: ORD202502180123
   */
  generateOrderNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${random}`;
  }

  /**
   * 生成账单号: BILL + 年月日 + 4位随机数
   * 示例: BILL202502180123
   */
  generateBillNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BILL${year}${month}${day}${random}`;
  }

  /**
   * 生成发票号: INV + 年月日 + 4位随机数
   * 示例: INV202502180123
   */
  generateInvoiceNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV${year}${month}${day}${random}`;
  }

  /**
   * 生成货物号: SH + 时间戳
   * 示例: SH1708243200000
   */
  generateShipmentNo(): string {
    const timestamp = Date.now();
    return `SH${timestamp}`;
  }

  /**
   * 生成自定义编号
   * @param prefix 前缀
   * @param useTimestamp 是否使用时间戳（否则使用年月日+4位随机数）
   * @returns 自定义编号
   */
  generateCustomCode(prefix: string, useTimestamp = false): string {
    if (useTimestamp) {
      return `${prefix}${Date.now()}`;
    }
    
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}${month}${day}${random}`;
  }

  /**
   * 生成带日期前缀的编号
   * @param prefix 前缀
   * @param randomDigits 随机数位数
   * @returns 编号字符串
   */
  generateDatePrefixedCode(prefix: string, randomDigits = 4): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const maxRandom = Math.pow(10, randomDigits);
    const random = Math.floor(Math.random() * maxRandom).toString().padStart(randomDigits, '0');
    return `${prefix}${year}${month}${day}${random}`;
  }
}
