/**
 * Test Utilities Index
 * 
 * 统一导出所有测试工具
 */

// Prisma Mock Factory
export {
  PrismaMockFactory,
  MockPrismaClient,
  MockPrismaModel,
  MockPrismaMethod,
} from './prisma-mock.factory';

// Test Data Factory
export {
  TestDataFactory,
  UserBuilder,
  CompanyBuilder,
  OrderBuilder,
  ShipmentBuilder,
  BillBuilder,
  BillItemBuilder,
  TestUser,
  TestCompany,
  TestOrder,
  TestShipment,
  TestBill,
  TestBillItem,
  TestCompanyUser,
} from './test-data.factory';

// Test Module Utilities
export {
  TestModuleUtil,
  createTestModule,
  createTestModuleBuilder,
  createTestApp,
  createTestApplication,
  createJwtAuthGuardMock,
  createCustomJwtAuthGuardMock,
  createConfigServiceMock,
  createJwtServiceMock,
  sendRequest,
  sendAuthRequest,
  createPaginatedResponse,
  createApiResponse,
  createErrorResponse,
  wait,
  DEFAULT_MOCK_USER,
  ADMIN_MOCK_USER,
  DEFAULT_MOCK_CONFIG,
  DEFAULT_VALIDATION_PIPE_OPTIONS,
  MockUser,
  MockConfig,
  RequestMethod,
  RequestOptions,
  TestModuleOptions,
  TestAppOptions,
} from './test-module.util';
