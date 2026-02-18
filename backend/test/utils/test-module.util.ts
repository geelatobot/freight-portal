/**
 * TestModuleUtil - 统一测试模块配置工具
 * 
 * 提供统一的测试模块配置、全局管道、过滤器配置和常用 Guard mock
 */

import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';

// ==================== JWT Guard Mock ====================

export interface MockUser {
  id: string;
  username: string;
  role: string;
  defaultCompanyId?: string;
  [key: string]: any;
}

export const DEFAULT_MOCK_USER: MockUser = {
  id: 'user-1',
  username: 'testuser',
  role: 'OPERATOR',
  defaultCompanyId: 'company-1',
};

export const ADMIN_MOCK_USER: MockUser = {
  id: 'admin-1',
  username: 'admin',
  role: 'ADMIN',
  defaultCompanyId: 'company-1',
};

/**
 * 创建 JWT Auth Guard 的 mock
 */
export function createJwtAuthGuardMock(user: MockUser = DEFAULT_MOCK_USER) {
  return {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { ...user };
      return true;
    }),
  };
}

/**
 * 创建可自定义的 JWT Auth Guard mock
 */
export function createCustomJwtAuthGuardMock(
  canActivateFn: (context: any) => boolean | Promise<boolean>,
  user?: MockUser
) {
  return {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      if (user) {
        req.user = { ...user };
      }
      return canActivateFn(context);
    }),
  };
}

// ==================== Config Service Mock ====================

export interface MockConfig {
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  DATABASE_URL?: string;
  [key: string]: any;
}

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  JWT_SECRET: 'test-secret-key-for-testing-only',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  DATABASE_URL: 'mysql://test:test@localhost:3306/test',
};

/**
 * 创建 ConfigService 的 mock
 */
export function createConfigServiceMock(config: MockConfig = DEFAULT_MOCK_CONFIG) {
  return {
    get: jest.fn((key: string) => config[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = config[key];
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" not found`);
      }
      return value;
    }),
  };
}

// ==================== JwtService Mock ====================

export function createJwtServiceMock() {
  return {
    sign: jest.fn(() => 'mock-jwt-token'),
    signAsync: jest.fn(() => Promise.resolve('mock-jwt-token')),
    verify: jest.fn(() => ({ sub: 'user-1', username: 'testuser' })),
    verifyAsync: jest.fn(() => Promise.resolve({ sub: 'user-1', username: 'testuser' })),
    decode: jest.fn(() => ({ sub: 'user-1', username: 'testuser' })),
  };
}

// ==================== Test Module Builder ====================

export interface TestModuleOptions {
  controllers?: any[];
  providers?: any[];
  imports?: any[];
  exports?: any[];
  guards?: any[];
  config?: MockConfig;
  mockUser?: MockUser;
  overrideGuards?: boolean;
  validationPipeOptions?: ValidationPipeOptions;
}

export const DEFAULT_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
};

/**
 * 创建测试模块构建器
 */
export function createTestModuleBuilder(options: TestModuleOptions): TestingModuleBuilder {
  const {
    controllers = [],
    providers = [],
    imports = [],
    config = DEFAULT_MOCK_CONFIG,
    mockUser = DEFAULT_MOCK_USER,
    overrideGuards = true,
  } = options;

  const builder = Test.createTestingModule({
    controllers,
    providers: [
      ...providers,
      {
        provide: ConfigService,
        useValue: createConfigServiceMock(config),
      },
      {
        provide: JwtService,
        useValue: createJwtServiceMock(),
      },
    ],
    imports,
  });

  if (overrideGuards) {
    builder.overrideGuard(JwtAuthGuard).useValue(createJwtAuthGuardMock(mockUser));
  }

  return builder;
}

/**
 * 创建并编译测试模块
 */
export async function createTestModule(options: TestModuleOptions): Promise<TestingModule> {
  const builder = createTestModuleBuilder(options);
  return builder.compile();
}

// ==================== Test Application ====================

export interface TestAppOptions {
  module: TestingModule;
  validationPipeOptions?: ValidationPipeOptions;
  enableGlobalFilters?: boolean;
}

/**
 * 创建测试用的 Nest 应用实例
 */
export async function createTestApp(options: TestAppOptions): Promise<INestApplication> {
  const {
    module,
    validationPipeOptions = DEFAULT_VALIDATION_PIPE_OPTIONS,
    enableGlobalFilters = true,
  } = options;

  const app = module.createNestApplication();
  
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  
  if (enableGlobalFilters) {
    app.useGlobalFilters(new GlobalExceptionFilter());
  }

  await app.init();
  return app;
}

/**
 * 创建完整的测试应用（模块 + 应用实例）
 */
export async function createTestApplication(options: TestModuleOptions): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const module = await createTestModule(options);
  const app = await createTestApp({ module });
  return { app, module };
}

// ==================== HTTP Request Helpers ====================

export type RequestMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RequestOptions {
  method: RequestMethod;
  path: string;
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

/**
 * 发送 HTTP 请求（使用 supertest）
 */
export function sendRequest(app: INestApplication, options: RequestOptions) {
  const { method, path, body, headers = {}, query = {} } = options;
  
  let requestBuilder = request(app.getHttpServer())[method](path);
  
  // 添加查询参数
  if (Object.keys(query).length > 0) {
    requestBuilder = requestBuilder.query(query);
  }
  
  // 添加 headers
  Object.entries(headers).forEach(([key, value]) => {
    requestBuilder = requestBuilder.set(key, value);
  });
  
  // 添加 body
  if (body !== undefined) {
    requestBuilder = requestBuilder.send(body);
  }
  
  return requestBuilder;
}

/**
 * 发送带认证 token 的请求
 */
export function sendAuthRequest(
  app: INestApplication,
  options: RequestOptions,
  token: string = 'Bearer mock-token'
) {
  return sendRequest(app, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: token,
    },
  });
}

// ==================== Common Test Helpers ====================

/**
 * 等待指定时间（用于异步测试）
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建分页响应 mock
 */
export function createPaginatedResponse<T>(
  list: T[],
  page: number = 1,
  pageSize: number = 20,
  total?: number
) {
  const actualTotal = total !== undefined ? total : list.length;
  return {
    list,
    pagination: {
      page,
      pageSize,
      total: actualTotal,
      totalPages: Math.ceil(actualTotal / pageSize),
    },
  };
}

/**
 * 创建标准 API 响应 mock
 */
export function createApiResponse<T>(data: T, message: string = 'success') {
  return {
    code: 0,
    message,
    data,
  };
}

/**
 * 创建错误 API 响应 mock
 */
export function createErrorResponse(message: string, code: number = 1) {
  return {
    code,
    message,
    data: null,
  };
}

// ==================== TestModuleUtil Class ====================

export class TestModuleUtil {
  /**
   * 创建测试模块
   */
  static createModule(options: TestModuleOptions): Promise<TestingModule> {
    return createTestModule(options);
  }

  /**
   * 创建测试应用
   */
  static createApp(options: TestAppOptions): Promise<INestApplication> {
    return createTestApp(options);
  }

  /**
   * 创建完整的测试应用
   */
  static async createTestApplication(options: TestModuleOptions): Promise<{
    app: INestApplication;
    module: TestingModule;
  }> {
    return createTestApplication(options);
  }

  /**
   * 创建 JWT Guard mock
   */
  static createJwtGuard(user?: MockUser) {
    return createJwtAuthGuardMock(user);
  }

  /**
   * 创建 ConfigService mock
   */
  static createConfigService(config?: MockConfig) {
    return createConfigServiceMock(config);
  }

  /**
   * 创建 JwtService mock
   */
  static createJwtService() {
    return createJwtServiceMock();
  }

  /**
   * 创建分页响应
   */
  static createPaginatedResponse<T>(list: T[], page?: number, pageSize?: number, total?: number) {
    return createPaginatedResponse(list, page, pageSize, total);
  }

  /**
   * 发送 HTTP 请求
   */
  static sendRequest(app: INestApplication, options: RequestOptions) {
    return sendRequest(app, options);
  }

  /**
   * 发送带认证的 HTTP 请求
   */
  static sendAuthRequest(app: INestApplication, options: RequestOptions, token?: string) {
    return sendAuthRequest(app, options, token);
  }
}
