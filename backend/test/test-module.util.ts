import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMockFactory } from './prisma-mock.factory';

/**
 * 测试模块工具类
 * 用于简化测试模块的创建
 */
export class TestModuleUtil {
  /**
   * 创建基础测试模块
   */
  static async createTestingModule(options: {
    providers?: any[];
    controllers?: any[];
    imports?: any[];
  }): Promise<TestingModule> {
    return Test.createTestingModule({
      ...options,
      providers: [
        ...(options.providers || []),
        // 默认提供 ConfigService mock
        {
          provide: ConfigService,
          useValue: this.createConfigServiceMock(),
        },
      ],
    }).compile();
  }

  /**
   * 创建带 Prisma mock 的测试模块
   */
  static async createTestingModuleWithPrisma(options: {
    providers?: any[];
    controllers?: any[];
    imports?: any[];
    prismaMock?: jest.Mocked<PrismaClient>;
  }): Promise<{ module: TestingModule; prisma: jest.Mocked<PrismaClient> }> {
    const prismaMock = options.prismaMock || PrismaMockFactory.create();

    const module = await Test.createTestingModule({
      ...options,
      providers: [
        ...(options.providers || []),
        {
          provide: PrismaClient,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: this.createConfigServiceMock(),
        },
      ],
    }).compile();

    return { module, prisma: prismaMock };
  }

  /**
   * 创建 ConfigService mock
   */
  static createConfigServiceMock(): jest.Mocked<ConfigService> {
    return {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret-key-for-testing-only',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        };
        return config[key] ?? null;
      }),
      getOrThrow: jest.fn((key: string) => {
        const value = this.createConfigServiceMock().get!(key);
        if (value === null) {
          throw new Error(`Config key ${key} not found`);
        }
        return value;
      }),
    } as unknown as jest.Mocked<ConfigService>;
  }

  /**
   * 创建 JWT Service mock
   */
  static createJwtServiceMock(): any {
    return {
      sign: jest.fn(() => 'mock-jwt-token'),
      verify: jest.fn(() => ({ sub: 'user-1', username: 'testuser' })),
      decode: jest.fn(() => ({ sub: 'user-1', username: 'testuser' })),
    };
  }

  /**
   * 创建缓存服务 mock
   */
  static createCacheServiceMock(): any {
    const cache = new Map<string, any>();
    return {
      get: jest.fn((key: string) => Promise.resolve(cache.get(key))),
      set: jest.fn((key: string, value: any) => {
        cache.set(key, value);
        return Promise.resolve();
      }),
      del: jest.fn((key: string) => {
        cache.delete(key);
        return Promise.resolve();
      }),
      reset: jest.fn(() => {
        cache.clear();
        return Promise.resolve();
      }),
    };
  }

  /**
   * 创建邮件服务 mock
   */
  static createMailServiceMock(): any {
    return {
      sendMail: jest.fn(() => Promise.resolve({ messageId: 'mock-message-id' })),
    };
  }

  /**
   * 创建事件发射器 mock
   */
  static createEventEmitterMock(): any {
    return {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
    };
  }
}
