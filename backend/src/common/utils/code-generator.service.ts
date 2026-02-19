import { Injectable } from '@nestjs/common';

/**
 * 代码生成服务
 * 用于生成各种业务编号（订单号、账单号等）
 */
@Injectable()
export class CodeGeneratorService {
  /**
   * 生成订单号
   * 格式: ORD{YYYYMMDD}{4位随机数}
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
   * 生成账单号
   * 格式: BILL{YYYYMMDD}{4位随机数}
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
   * 生成发票号
   * 格式: INV{YYYYMMDD}{4位随机数}
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
   * 生成运单号
   * 格式: SHIP{YYYYMMDD}{4位随机数}
   */
  generateShipmentNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SHIP${year}${month}${day}${random}`;
  }

  /**
   * 生成自定义编号
   * @param prefix 前缀
   * @param dateFormat 日期格式 'YYYYMMDD' | 'YYYYMM' | 'YYYY'
   * @param randomLength 随机数位数
   */
  generateCustomCode(
    prefix: string,
    dateFormat: 'YYYYMMDD' | 'YYYYMM' | 'YYYY' = 'YYYYMMDD',
    randomLength: number = 4,
  ): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    let dateStr: string;
    switch (dateFormat) {
    case 'YYYYMM':
      dateStr = `${year}${month}`;
      break;
    case 'YYYY':
      dateStr = `${year}`;
      break;
    case 'YYYYMMDD':
    default:
      dateStr = `${year}${month}${day}`;
      break;
    }
    
    const maxRandom = Math.pow(10, randomLength);
    const random = Math.floor(Math.random() * maxRandom).toString().padStart(randomLength, '0');
    return `${prefix}${dateStr}${random}`;
  }
}
