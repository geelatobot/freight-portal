import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class FourPortunService {
  private readonly httpClient: AxiosInstance;
  private readonly authClient: AxiosInstance;
  private readonly appId: string;
  private readonly secret: string;
  private readonly baseUrl: string;
  private token: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get('FOURPORTUN_APPID');
    this.secret = this.configService.get('FOURPORTUN_SECRET');
    this.baseUrl = this.configService.get('FOURPORTUN_API_URL') || 'https://prod-api.4portun.com';
    
    // 认证客户端（用于获取token）
    this.authClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // 业务客户端
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // 添加请求拦截器，自动添加认证信息
    this.httpClient.interceptors.request.use(async (config) => {
      // 确保token有效
      await this.ensureToken();
      
      // 添加认证头
      config.headers['appId'] = this.appId;
      config.headers['Authorization'] = this.token;
      
      return config;
    });
  }

  /**
   * 获取token
   */
  async getToken(): Promise<string> {
    try {
      const response = await this.authClient.post('/openapi/auth/token', {
        appId: this.appId,
        secret: this.secret,
      });

      if (response.data.code === 200) {
        return response.data.data;
      } else {
        throw new Error(`获取token失败: ${response.data.message}`);
      }
    } catch (error) {
      throw new HttpException(
        'Failed to get 4portun token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * 确保token有效（如果过期则重新获取）
   */
  private async ensureToken(): Promise<void> {
    const now = Date.now();
    
    // 如果token不存在或即将过期（提前5分钟刷新）
    if (!this.token || now >= this.tokenExpireTime - 5 * 60 * 1000) {
      this.token = await this.getToken();
      // token有效期24小时，记录过期时间
      this.tokenExpireTime = now + 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 查询集装箱跟踪信息
   */
  async trackContainer(containerNo: string) {
    try {
      const response = await this.httpClient.get(`/openapi/tracking/container/${containerNo}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 查询提单跟踪信息
   */
  async trackBillOfLading(blNo: string) {
    try {
      const response = await this.httpClient.get(`/openapi/tracking/bl/${blNo}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 批量查询集装箱
   */
  async batchTrackContainers(containerNos: string[]) {
    try {
      const response = await this.httpClient.post('/openapi/tracking/containers/batch', {
        containerNos,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 查询海关状态
   */
  async queryCustomsStatus(containerNo: string) {
    try {
      const response = await this.httpClient.get(`/openapi/customs/container/${containerNo}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 订阅货物状态推送
   */
  async subscribeTracking(containerNo: string, callbackUrl: string) {
    try {
      const response = await this.httpClient.post('/openapi/tracking/subscribe', {
        containerNo,
        callbackUrl,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 取消订阅
   */
  async unsubscribeTracking(containerNo: string) {
    try {
      const response = await this.httpClient.delete(`/openapi/tracking/subscribe/${containerNo}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 处理Webhook推送
   */
  async handleWebhook(payload: any) {
    // 验证签名
    const isValid = this.verifyWebhookSignature(payload);
    if (!isValid) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // 处理推送数据
    const { containerNo, events, timestamp } = payload;

    // 查找对应的货物
    const shipment = await this.prisma.shipment.findUnique({
      where: { containerNo },
    });

    if (!shipment) {
      return { message: 'Shipment not found', containerNo };
    }

    // 保存节点数据
    for (const event of events) {
      await this.prisma.shipmentNode.upsert({
        where: {
          shipmentId_nodeCode_eventTime: {
            shipmentId: shipment.id,
            nodeCode: event.nodeCode,
            eventTime: new Date(event.eventTime),
          },
        },
        update: {
          nodeName: event.nodeName,
          location: event.location,
          description: event.description,
          operator: event.operator,
          rawData: event,
        },
        create: {
          shipmentId: shipment.id,
          nodeCode: event.nodeCode,
          nodeName: event.nodeName,
          location: event.location,
          eventTime: new Date(event.eventTime),
          description: event.description,
          operator: event.operator,
          source: '4portun',
          rawData: event,
        },
      });
    }

    // 更新货物当前状态
    const latestEvent = events[events.length - 1];
    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        currentNode: latestEvent.nodeCode,
        lastSyncAt: new Date(timestamp),
      },
    });

    return { message: 'Webhook processed', containerNo, eventCount: events.length };
  }

  /**
   * 验证Webhook签名
   */
  private verifyWebhookSignature(payload: any): boolean {
    const secret = this.configService.get('FOURPORTUN_WEBHOOK_SECRET');
    if (!secret) return true;
    
    // TODO: 根据4portun的签名算法实现验证
    return true;
  }

  /**
   * 错误处理
   */
  private handleError(error: any) {
    if (error.response) {
      const { status, data } = error.response;
      
      // token过期，清除token让下次自动刷新
      if (status === 401) {
        this.token = null;
        this.tokenExpireTime = 0;
      }
      
      throw new HttpException(
        data?.message || '4portun API error',
        status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    throw new HttpException(
      'Failed to connect to 4portun API',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
