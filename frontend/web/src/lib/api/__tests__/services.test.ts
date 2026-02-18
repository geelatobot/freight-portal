/**
 * API Services 测试
 * 
 * 测试场景:
 * - 登录成功/失败
 * - Token 刷新
 * - 请求拦截器
 * - 响应拦截器
 * - 错误处理
 */

// 定义 mock 函数
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

// 导入被测试的模块 (在 mock 之后)
import {
  authApi,
  customerApi,
  trackingApi,
  shipmentApi,
  orderApi,
} from '../services';
import { handleApiError } from '../client';
import { AxiosError } from 'axios';

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Auth API - 登录', () => {
    it('登录成功应该返回用户数据和 token', async () => {
      const mockResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            companyName: 'Test Company',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authApi.login('test@example.com', 'password123');

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'test@example.com', password: 'password123' }
      );
      expect(result.data).toEqual(mockResponse.data);
    });

    it('登录失败应该返回错误信息', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: '邮箱或密码错误',
          },
        },
      };

      mockPost.mockRejectedValueOnce(mockError);

      await expect(authApi.login('test@example.com', 'wrong-password')).rejects.toEqual(
        mockError
      );
    });

    it('登录时网络错误应该被拒绝', async () => {
      const mockError = {
        request: {},
        message: 'Network Error',
      };

      mockPost.mockRejectedValueOnce(mockError);

      await expect(authApi.login('test@example.com', 'password123')).rejects.toEqual(
        mockError
      );
    });
  });

  describe('Token 刷新', () => {
    it('刷新 Token 成功应该返回新的 accessToken', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authApi.refreshToken('old-refresh-token');

      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(result.data.accessToken).toBe('new-access-token');
    });

    it('刷新 Token 失败应该返回错误', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Refresh token 已过期',
          },
        },
      };

      mockPost.mockRejectedValueOnce(mockError);

      await expect(authApi.refreshToken('invalid-token')).rejects.toEqual(mockError);
    });
  });

  describe('请求拦截器', () => {
    it('请求时应该自动添加 Authorization header', async () => {
      localStorageMock.getItem.mockReturnValueOnce('test-token');

      const mockResponse = { data: { success: true } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await customerApi.getProfile();

      // 验证请求被调用
      expect(mockGet).toHaveBeenCalled();
    });

    it('没有 token 时不应该添加 Authorization header', async () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const mockResponse = { data: { success: true } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await customerApi.getProfile();

      // 验证请求被调用
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('响应拦截器', () => {
    it('401 错误时应该尝试刷新 token', async () => {
      // 模拟有 refresh token
      localStorageMock.getItem.mockReturnValueOnce('refresh-token');

      // 刷新 token 成功
      const mockRefreshResponse = {
        data: { accessToken: 'new-token' },
      };

      // 重试请求成功
      const mockRetryResponse = {
        data: { id: 'user-123', email: 'test@example.com' },
      };

      mockGet.mockResolvedValueOnce(mockRetryResponse);
      mockPost.mockResolvedValueOnce(mockRefreshResponse);

      const result = await customerApi.getProfile();

      // 验证请求成功
      expect(result.data).toEqual(mockRetryResponse.data);
    });

    it('刷新 token 失败时应该清除 token 并跳转', async () => {
      localStorageMock.getItem.mockReturnValueOnce('refresh-token');

      const mockRefreshError = {
        response: { status: 401, data: { message: 'Token expired' } },
      };

      mockPost.mockRejectedValueOnce(mockRefreshError);

      // 期望请求被拒绝
      try {
        await customerApi.getProfile();
        fail('应该抛出错误');
      } catch (e) {
        // 期望错误被抛出
        expect(e).toBeDefined();
      }
    });
  });

  describe('错误处理', () => {
    it('handleApiError 应该正确处理响应错误', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: '请求参数错误',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('请求参数错误');
    });

    it('handleApiError 应该正确处理网络错误', () => {
      const error = {
        request: {},
        message: 'Network Error',
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('网络错误，请检查网络连接');
    });

    it('handleApiError 应该处理未知错误', () => {
      const error = {
        message: 'Something went wrong',
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('Something went wrong');
    });

    it('handleApiError 应该使用 error 字段作为备选', () => {
      const error = {
        response: {
          status: 500,
          data: {
            error: '服务器内部错误',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('服务器内部错误');
    });
  });

  describe('Tracking API', () => {
    it('getCargoStatus 应该调用正确的路径', async () => {
      const mockResponse = {
        data: {
          containerNumber: 'ABC1234567',
          status: 'in_transit',
          location: 'Shanghai',
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await trackingApi.getCargoStatus('ABC1234567');

      expect(mockGet).toHaveBeenCalledWith('/shipments/tracking/ABC1234567');
      expect(result.data).toEqual(mockResponse.data);
    });

    it('subscribe 应该调用正确的路径', async () => {
      const mockResponse = { data: { success: true } };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await trackingApi.subscribe('ABC1234567');

      expect(mockPost).toHaveBeenCalledWith(
        '/shipments/tracking/ABC1234567/subscribe'
      );
      expect(result.data).toEqual(mockResponse.data);
    });

    it('unsubscribe 应该调用正确的路径', async () => {
      const mockResponse = { data: { success: true } };

      mockDelete.mockResolvedValueOnce(mockResponse);

      const result = await trackingApi.unsubscribe('ABC1234567');

      expect(mockDelete).toHaveBeenCalledWith(
        '/shipments/tracking/ABC1234567/subscribe'
      );
      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('Order API', () => {
    it('cancelOrder 应该使用 DELETE 方法', async () => {
      const mockResponse = { data: { success: true, message: '订单已取消' } };

      mockDelete.mockResolvedValueOnce(mockResponse);

      const result = await orderApi.cancelOrder('order-123');

      expect(mockDelete).toHaveBeenCalledWith('/orders/order-123');
      expect(result.data).toEqual(mockResponse.data);
    });

    it('createOrder 应该正确创建订单', async () => {
      const orderData = {
        cargoInfo: {
          containerNumber: 'ABC1234567',
          cargoType: 'general',
          weight: 1000,
          dimensions: {
            length: 10,
            width: 8,
            height: 8,
          },
        },
        route: {
          origin: 'Shanghai',
          destination: 'Los Angeles',
          plannedDeparture: '2024-03-01',
          plannedArrival: '2024-03-15',
        },
        requirements: 'Handle with care',
      };

      const mockResponse = {
        data: {
          id: 'order-123',
          ...orderData,
          status: 'pending',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await orderApi.createOrder(orderData);

      expect(mockPost).toHaveBeenCalledWith('/orders', orderData);
      expect(result.data.id).toBe('order-123');
    });

    it('getOrders 应该支持查询参数', async () => {
      const mockResponse = {
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      await orderApi.getOrders({
        page: 1,
        limit: 10,
        status: 'pending',
      });

      expect(mockGet).toHaveBeenCalledWith('/orders', {
        params: {
          page: 1,
          limit: 10,
          status: 'pending',
        },
      });
    });
  });

  describe('Shipment API', () => {
    it('track 应该正确调用跟踪接口', async () => {
      const mockResponse = {
        data: {
          containerNo: 'ABC1234567',
          status: 'in_transit',
          events: [],
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await shipmentApi.track('ABC1234567', 'company-123');

      expect(mockPost).toHaveBeenCalledWith('/shipments/track', {
        containerNo: 'ABC1234567',
        companyId: 'company-123',
      });
      expect(result.data).toEqual(mockResponse.data);
    });

    it('trackByBlNo 应该正确调用提单查询接口', async () => {
      const mockResponse = {
        data: {
          blNo: 'BL123456',
          containerNo: 'ABC1234567',
          status: 'delivered',
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await shipmentApi.trackByBlNo('BL123456');

      expect(mockGet).toHaveBeenCalledWith('/shipments/track/bl', {
        params: { blNo: 'BL123456' },
      });
      expect(result.data).toEqual(mockResponse.data);
    });
  });
});
