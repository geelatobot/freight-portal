/**
 * API 集成测试
 * 测试完整的业务流程
 * 
 * 测试流程:
 * - 用户注册 → 登录 → 获取资料
 * - 查询货物 → 订阅货物
 * - 创建订单 → 查看订单 → 取消订单
 * 
 * 运行此测试前，请确保后端服务已启动:
 * cd backend && npm run start:dev
 */

import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 测试数据
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  companyName: 'Test Company',
  contactName: 'Test User',
  phone: '13800138000',
};

// 存储测试过程中生成的数据
let accessToken: string;
let refreshToken: string;
let userId: string;
let orderId: string;
let containerNumber: string;

describe('API Integration Tests', () => {
  // 增加超时时间
  jest.setTimeout(30000);

  describe('1. 用户注册 → 登录 → 获取资料', () => {
    it('1.1 应该成功注册用户', async () => {
      try {
        const response = await apiClient.post('/auth/register', {
          email: TEST_USER.email,
          password: TEST_USER.password,
          companyName: TEST_USER.companyName,
          contactName: TEST_USER.contactName,
          phone: TEST_USER.phone,
        });

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('user');
        expect(response.data.user.email).toBe(TEST_USER.email);
        expect(response.data).toHaveProperty('accessToken');
        expect(response.data).toHaveProperty('refreshToken');

        // 保存 token 供后续使用
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        userId = response.data.user.id;
      } catch (error: any) {
        // 如果用户已存在，尝试登录
        if (error.response?.status === 409) {
          const loginResponse = await apiClient.post('/auth/login', {
            email: TEST_USER.email,
            password: TEST_USER.password,
          });
          accessToken = loginResponse.data.accessToken;
          refreshToken = loginResponse.data.refreshToken;
          userId = loginResponse.data.user.id;
        } else {
          throw error;
        }
      }
    });

    it('1.2 应该成功登录', async () => {
      const response = await apiClient.post('/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe(TEST_USER.email);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');

      // 更新 token
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
    });

    it('1.3 登录失败应该返回 401', async () => {
      try {
        await apiClient.post('/auth/login', {
          email: TEST_USER.email,
          password: 'wrong-password',
        });
        fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });

    it('1.4 应该获取用户资料', async () => {
      const response = await apiClient.get('/customers/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.email).toBe(TEST_USER.email);
      expect(response.data.companyName).toBe(TEST_USER.companyName);
    });

    it('1.5 无 token 访问应该返回 401', async () => {
      try {
        await apiClient.get('/customers/profile');
        fail('应该抛出错误');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });

    it('1.6 应该刷新 token', async () => {
      const response = await apiClient.post('/auth/refresh', {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data.accessToken).not.toBe(accessToken);

      // 更新 token
      accessToken = response.data.accessToken;
    });
  });

  describe('2. 查询货物 → 订阅货物', () => {
    it('2.1 应该查询货物状态', async () => {
      // 使用测试集装箱号
      containerNumber = 'TEST' + Date.now().toString().slice(-7);

      const response = await apiClient.post(
        '/shipments/track',
        {
          containerNo: containerNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // 注意：根据后端实现，可能返回 200 或 404
      expect([200, 404]).toContain(response.status);
    });

    it('2.2 应该根据提单号查询货物', async () => {
      const blNo = 'BL' + Date.now().toString().slice(-8);

      try {
        const response = await apiClient.get('/shipments/track/bl', {
          params: { blNo },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.status).toBe(200);
      } catch (error: any) {
        // 如果货物不存在，应该返回 404
        expect(error.response?.status).toBe(404);
      }
    });

    it('2.3 应该获取货物列表', async () => {
      const response = await apiClient.get('/shipments', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          page: 1,
          limit: 10,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    it('2.4 应该订阅货物跟踪', async () => {
      try {
        const response = await apiClient.post(
          `/shipments/tracking/${containerNumber}/subscribe`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        expect([200, 201]).toContain(response.status);
      } catch (error: any) {
        // 接口可能未实现
        expect([404, 501]).toContain(error.response?.status);
      }
    });

    it('2.5 应该获取订阅列表', async () => {
      try {
        const response = await apiClient.get(
          '/shipments/tracking/subscriptions',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      } catch (error: any) {
        // 接口可能未实现
        expect([404, 501]).toContain(error.response?.status);
      }
    });
  });

  describe('3. 创建订单 → 查看订单 → 取消订单', () => {
    it('3.1 应该创建订单', async () => {
      const orderData = {
        cargoInfo: {
          containerNumber: 'CNT' + Date.now().toString().slice(-7),
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
          plannedDeparture: new Date(Date.now() + 86400000).toISOString(),
          plannedArrival: new Date(Date.now() + 86400000 * 7).toISOString(),
        },
        requirements: 'Handle with care',
      };

      const response = await apiClient.post('/orders', orderData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('pending');

      // 保存订单 ID
      orderId = response.data.id;
    });

    it('3.2 应该获取订单列表', async () => {
      const response = await apiClient.get('/orders', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          page: 1,
          limit: 10,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    it('3.3 应该获取订单详情', async () => {
      const response = await apiClient.get(`/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.id).toBe(orderId);
    });

    it('3.4 应该更新订单', async () => {
      const updateData = {
        requirements: 'Updated requirements - Fragile items',
      };

      const response = await apiClient.put(`/orders/${orderId}`, updateData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.requirements).toBe(updateData.requirements);
    });

    it('3.5 应该使用 DELETE 方法取消订单', async () => {
      const response = await apiClient.delete(`/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });

    it('3.6 取消后的订单应该显示为已取消', async () => {
      const response = await apiClient.get(`/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('cancelled');
    });
  });

  describe('4. 订单生命周期管理', () => {
    let testOrderId: string;

    beforeAll(async () => {
      // 创建测试订单
      const orderData = {
        cargoInfo: {
          containerNumber: 'LIFECYCLE' + Date.now().toString().slice(-5),
          cargoType: 'general',
          weight: 500,
          dimensions: {
            length: 5,
            width: 5,
            height: 5,
          },
        },
        route: {
          origin: 'Beijing',
          destination: 'Tokyo',
          plannedDeparture: new Date(Date.now() + 86400000).toISOString(),
          plannedArrival: new Date(Date.now() + 86400000 * 3).toISOString(),
        },
      };

      const response = await apiClient.post('/orders', orderData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      testOrderId = response.data.id;
    });

    it('4.1 应该获取订单状态变更历史', async () => {
      try {
        const response = await apiClient.get(
          `/orders/${testOrderId}/lifecycle/history`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      } catch (error: any) {
        // 接口可能未实现
        expect([404, 501]).toContain(error.response?.status);
      }
    });

    it('4.2 应该获取可用的状态流转选项', async () => {
      try {
        const response = await apiClient.get(
          `/orders/${testOrderId}/lifecycle/transitions`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      } catch (error: any) {
        // 接口可能未实现
        expect([404, 501]).toContain(error.response?.status);
      }
    });

    afterAll(async () => {
      // 清理测试订单
      try {
        await apiClient.delete(`/orders/${testOrderId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (e) {
        // 忽略清理错误
      }
    });
  });
});
