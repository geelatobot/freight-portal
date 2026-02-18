/**
 * PrismaMockFactory - 统一的 Prisma Client Mock 工厂
 * 
 * 提供所有模型的 mock 方法，支持链式调用 mockResolvedValue
 */

export type MockPrismaMethod<T = any> = jest.Mock<Promise<T>, any[]> & {
  mockResolvedValue: (value: T) => MockPrismaMethod<T>;
  mockRejectedValue: (value: any) => MockPrismaMethod<T>;
  mockResolvedValueOnce: (value: T) => MockPrismaMethod<T>;
};

export interface MockPrismaModel<T = any> {
  findFirst: MockPrismaMethod<T | null>;
  findUnique: MockPrismaMethod<T | null>;
  findMany: MockPrismaMethod<T[]>;
  create: MockPrismaMethod<T>;
  update: MockPrismaMethod<T>;
  updateMany: MockPrismaMethod<{ count: number }>;
  delete: MockPrismaMethod<T>;
  deleteMany: MockPrismaMethod<{ count: number }>;
  count: MockPrismaMethod<number>;
  aggregate: MockPrismaMethod<any>;
  groupBy: MockPrismaMethod<any[]>;
}

export interface MockPrismaClient {
  user: MockPrismaModel;
  company: MockPrismaModel;
  companyUser: MockPrismaModel;
  order: MockPrismaModel;
  shipment: MockPrismaModel;
  bill: MockPrismaModel;
  billItem: MockPrismaModel;
  invoice: MockPrismaModel;
  systemConfig: MockPrismaModel;
  operationLog: MockPrismaModel;
  orderStatusHistory: MockPrismaModel;
  billStatusHistory: MockPrismaModel;
  companyVerification: MockPrismaModel;
  syncLog: MockPrismaModel;
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
}

export class PrismaMockFactory {
  /**
   * 创建单个模型的 mock
   */
  static createModelMock<T = any>(): MockPrismaModel<T> {
    return {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    };
  }

  /**
   * 创建完整的 Prisma Client mock
   */
  static createPrismaMock(): MockPrismaClient {
    return {
      user: this.createModelMock(),
      company: this.createModelMock(),
      companyUser: this.createModelMock(),
      order: this.createModelMock(),
      shipment: this.createModelMock(),
      bill: this.createModelMock(),
      billItem: this.createModelMock(),
      invoice: this.createModelMock(),
      systemConfig: this.createModelMock(),
      operationLog: this.createModelMock(),
      orderStatusHistory: this.createModelMock(),
      billStatusHistory: this.createModelMock(),
      companyVerification: this.createModelMock(),
      syncLog: this.createModelMock(),
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };
  }

  /**
   * 创建支持事务回调的 Prisma mock
   * 用于模拟 $transaction(callback) 的场景
   */
  static createPrismaMockWithTransaction(): MockPrismaClient {
    const mock = this.createPrismaMock();
    
    mock.$transaction.mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(mock);
      }
      // 如果是数组形式的事务
      return Promise.all(callback);
    });

    return mock;
  }

  /**
   * 重置所有 mock 方法
   */
  static resetMocks(mock: MockPrismaClient): void {
    Object.values(mock).forEach((value) => {
      if (value && typeof value === 'object') {
        Object.values(value).forEach((method: any) => {
          if (typeof method === 'function' && method.mockClear) {
            method.mockClear();
          }
        });
      }
    });
  }

  /**
   * 清除所有 mock 方法
   */
  static clearMocks(mock: MockPrismaClient): void {
    Object.values(mock).forEach((value) => {
      if (value && typeof value === 'object') {
        Object.values(value).forEach((method: any) => {
          if (typeof method === 'function' && method.mockReset) {
            method.mockReset();
          }
        });
      }
    });
  }
}
