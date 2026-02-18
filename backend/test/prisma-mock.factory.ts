import { PrismaClient } from '@prisma/client';

/**
 * Prisma Mock 工厂
 * 用于创建 PrismaClient 的 mock 对象
 */
export class PrismaMockFactory {
  /**
   * 创建基础 Prisma mock
   */
  static create(): jest.Mocked<PrismaClient> {
    return {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $extends: jest.fn(),
      user: this.createModelMock(),
      company: this.createModelMock(),
      companyUser: this.createModelMock(),
      order: this.createModelMock(),
      shipment: this.createModelMock(),
      bill: this.createModelMock(),
      billItem: this.createModelMock(),
      invoice: this.createModelMock(),
      notification: this.createModelMock(),
      syncLog: this.createModelMock(),
    } as unknown as jest.Mocked<PrismaClient>;
  }

  /**
   * 创建单个模型 mock
   */
  private static createModelMock() {
    return {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    };
  }

  /**
   * 创建带事务支持的 mock
   */
  static createWithTransaction(): jest.Mocked<PrismaClient> {
    const mock = this.create();
    
    mock.$transaction.mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(mock);
      }
      // 如果是数组，按顺序执行
      if (Array.isArray(callback)) {
        const results = [];
        for (const operation of callback) {
          results.push(await operation);
        }
        return results;
      }
      return callback;
    });

    return mock;
  }
}
