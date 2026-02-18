/**
 * 任务 1.2.1: FourPortunService 完整实现 - 4Portun 服务
 * 实现 API 认证、集装箱跟踪、批量查询、Webhook 订阅和签名验证
 */

import { Injectable, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { WinstonLoggerService } from '../../../common/logger/winston-logger.service';
import { ErrorCode } from '../../../common/constants/error-codes';
import { FourPortunException } from '../../../common/exceptions/business.exception';
import {
  FOURPORTUN_CONFIG,
  FOURPORTUN_ENDPOINTS,
  CARRIER_CODE_MAP,
  PORT_CODE_MAP,
  NODE_CODE_MAP,
  STATUS_MAP,
} from '../config/fourportun.config';

/**
 * API 响应接口
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 跟踪节点接口
 */
export interface TrackingNode {
  nodeCode: string;
  nodeName: string;
  location?: string;
  locationCode?: string;
  eventTime: string;
  description?: string;
  operator?: string;
  vesselName?: string;
  voyageNo?: string;
  [key: string]: any;
}

/**
 * 集装箱跟踪数据接口
 */
export interface ContainerTrackingData {
  containerNo: string;
  containerType?: string;
  blNo?: string;
  bookingNo?: string;
  carrierCode?: string;
  carrierName?: string;
  originPort?: string;
  destinationPort?: string;
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  status?: string;
  nodes?: TrackingNode[];
  [key: string]: any;
}

@Injectable()
export class FourPortunService implements OnModuleInit {
  private readonly httpClient: AxiosInstance;
  private readonly authClient: AxiosInstance;
  private readonly appId: string;
  private readonly secret: string;
  private readonly webhookSecret: string;
  private token: string | null = null;
  private tokenExpireTime: number = 0;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.appId = this.configService.get('FOURPORTUN_APPID') || '';
    this.secret = this.configService.get('FOURPORTUN_SECRET') || '';
    this.webhookSecret = this.configService.get('FOURPORTUN_WEBHOOK_SECRET') || '';

    // 认证客户端（用于获取token）
    this.authClient = axios.create({
      baseURL: FOURPORTUN_CONFIG.BASE_URL,
      timeout: FOURPORTUN_CONFIG.AUTH_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 业务客户端
    this.httpClient = axios.create({
      baseURL: FOURPORTUN_CONFIG.BASE_URL,
      timeout: FOURPORTUN_CONFIG.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加请求拦截器，自动添加认证信息
    this.httpClient.interceptors.request.use(
      async (config) => {
        // 检查限流
        this.checkRateLimit();
        
        // 确保token有效
        await this.ensureToken();
        
        // 添加认证头
        config.headers['appId'] = this.appId;
        config.headers['Authorization'] = `Bearer ${this.token}`;
        
        return config;
      },
      (error) => Promise.reject(error),
    );

    // 添加响应拦截器，统一错误处理
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        return this.handleApiError(error);
      },
    );
  }

  async onModuleInit() {
    this.logger.setContext('FourPortunService');
    
    if (!this.appId || !this.secret) {
      this.logger.warn('4Portun credentials not configured, service will be unavailable');
    } else {
      this.logger.log('FourPortunService initialized');
    }
  }

  // ==================== 认证相关 ====================

  /**
   * 获取访问令牌
   * 实现指数退避重试机制
   */
  async getToken(): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < FOURPORTUN_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await this.authClient.post<ApiResponse<string>>(
          FOURPORTUN_ENDPOINTS.AUTH_TOKEN,
          {
            appId: this.appId,
            secret: this.secret,
          },
        );

        if (response.data.code === 200 && response.data.data) {
          this.logger.log('Successfully obtained 4Portun token');
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Token request failed');
        }
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < FOURPORTUN_CONFIG.MAX_RETRIES - 1) {
          // 指数退避
          const delay = Math.min(
            FOURPORTUN_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt),
            FOURPORTUN_CONFIG.RETRY_DELAY_MAX,
          );
          this.logger.warn(`Token request failed (attempt ${attempt + 1}), retrying in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error('Failed to get 4Portun token after max retries', lastError?.stack);
    throw new FourPortunException(
      ErrorCode.FOURPORTUN_AUTH_FAILED,
      '无法获取4Portun访问令牌',
      { error: lastError?.message },
    );
  }

  /**
   * 确保令牌有效
   */
  private async ensureToken(): Promise<void> {
    const now = Date.now();

    // 如果token不存在或即将过期（提前5分钟刷新）
    if (!this.token || now >= this.tokenExpireTime - FOURPORTUN_CONFIG.TOKEN_REFRESH_BUFFER) {
      this.token = await this.getToken();
      // token有效期24小时，记录过期时间
      this.tokenExpireTime = now + FOURPORTUN_CONFIG.TOKEN_EXPIRY;
    }
  }

  /**
   * 清除令牌（用于强制刷新）
   */
  private clearToken(): void {
    this.token = null;
    this.tokenExpireTime = 0;
  }

  // ==================== 限流控制 ====================

  /**
   * 检查并控制请求频率
   */
  private checkRateLimit(): void {
    const now = Date.now();
    
    // 每分钟重置计数器
    if (now - this.lastResetTime >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // 检查是否超过限流
    if (this.requestCount >= FOURPORTUN_CONFIG.RATE_LIMIT_PER_MINUTE) {
      throw new FourPortunException(
        ErrorCode.FOURPORTUN_RATE_LIMIT,
        '请求频率超限，请稍后再试',
      );
    }

    this.requestCount++;
  }

  // ==================== 集装箱跟踪 ====================

  /**
   * 查询单个集装箱跟踪信息
   * 支持指数退避重试
   */
  async trackContainer(containerNo: string): Promise<ContainerTrackingData> {
    this.logger.logExternalApi('4Portun', 'GET', `/tracking/container/${containerNo}`);

    return this.executeWithRetry(async () => {
      const response = await this.httpClient.get<ApiResponse<ContainerTrackingData>>(
        FOURPORTUN_ENDPOINTS.TRACK_CONTAINER(containerNo),
      );

      if (response.data.code === 200) {
        return this.normalizeTrackingData(response.data.data);
      } else {
        throw new Error(response.data.message);
      }
    });
  }

  /**
   * 查询提单跟踪信息
   */
  async trackBillOfLading(blNo: string): Promise<ContainerTrackingData[]> {
    this.logger.logExternalApi('4Portun', 'GET', `/tracking/bl/${blNo}`);

    return this.executeWithRetry(async () => {
      const response = await this.httpClient.get<ApiResponse<ContainerTrackingData[]>>(
        FOURPORTUN_ENDPOINTS.TRACK_BL(blNo),
      );

      if (response.data.code === 200) {
        return response.data.data.map(item => this.normalizeTrackingData(item));
      } else {
        throw new Error(response.data.message);
      }
    });
  }

  /**
   * 批量查询集装箱
   * 单次最多支持50个集装箱
   */
  async batchTrackContainers(containerNos: string[]): Promise<ContainerTrackingData[]> {
    if (containerNos.length === 0) {
      return [];
    }

    if (containerNos.length > 50) {
      throw new FourPortunException(
        ErrorCode.INVALID_PARAMS,
        '单次批量查询最多支持50个集装箱',
      );
    }

    this.logger.logExternalApi('4Portun', 'POST', '/tracking/containers/batch', {
      count: containerNos.length,
    });

    return this.executeWithRetry(async () => {
      const response = await this.httpClient.post<ApiResponse<ContainerTrackingData[]>>(
        FOURPORTUN_ENDPOINTS.TRACK_BATCH,
        { containerNos },
        { timeout: FOURPORTUN_CONFIG.BATCH_TIMEOUT },
      );

      if (response.data.code === 200) {
        return response.data.data.map(item => this.normalizeTrackingData(item));
      } else {
        throw new Error(response.data.message);
      }
    });
  }

  /**
   * 查询海关状态
   */
  async queryCustomsStatus(containerNo: string): Promise<any> {
    this.logger.logExternalApi('4Portun', 'GET', `/customs/container/${containerNo}`);

    return this.executeWithRetry(async () => {
      const response = await this.httpClient.get<ApiResponse<any>>(
        FOURPORTUN_ENDPOINTS.CUSTOMS_STATUS(containerNo),
      );

      if (response.data.code === 200) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    });
  }

  // ==================== Webhook 订阅 ====================

  /**
   * 订阅货物状态推送
   */
  async subscribeTracking(containerNo: string, callbackUrl?: string): Promise<any> {
    this.logger.logExternalApi('4Portun', 'POST', '/tracking/subscribe', {
      containerNo,
      callbackUrl,
    });

    return this.executeWithRetry(async () => {
      const response = await this.httpClient.post<ApiResponse<any>>(
        FOURPORTUN_ENDPOINTS.SUBSCRIBE,
        {
          containerNo,
          callbackUrl: callbackUrl || this.configService.get('WEBHOOK_BASE_URL'),
        },
      );

      if (response.data.code === 200) {
        this.logger.log(`Subscribed tracking for container: ${containerNo}`);
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    });
  }

  /**
   * 取消订阅
   */
  async unsubscribeTracking(containerNo: string): Promise<any> {
    this.logger.logExternalApi('4Portun', 'DELETE', `/tracking/subscribe/${containerNo}`);

    return this.executeWithRetry(async () => {
      const response = await this.httpClient.delete<ApiResponse<any>>(
        FOURPORTUN_ENDPOINTS.UNSUBSCRIBE(containerNo),
      );

      if (response.data.code === 200) {
        this.logger.log(`Unsubscribed tracking for container: ${containerNo}`);
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    });
  }

  // ==================== Webhook 处理 ====================

  /**
   * 验证 Webhook 签名
   * 使用 HMAC-SHA256 算法
   */
  verifyWebhookSignature(payload: any, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      // 检查时间戳是否在有效窗口内（防止重放攻击）
      const now = Date.now();
      const eventTime = parseInt(timestamp, 10);
      if (Math.abs(now - eventTime) > FOURPORTUN_CONFIG.WEBHOOK_TOLERANCE) {
        this.logger.warn(`Webhook timestamp too old: ${timestamp}`);
        return false;
      }

      // 计算签名
      const crypto = require('crypto');
      const data = `${timestamp}.${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(data)
        .digest('hex');

      // 使用 timing-safe 比较防止时序攻击
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', (error as Error).stack);
      return false;
    }
  }

  /**
   * 处理 Webhook 推送数据
   */
  processWebhookPayload(payload: any): {
    containerNo: string;
    events: any[];
    timestamp: string;
    normalizedData: any;
  } {
    const { containerNo, events, timestamp } = payload;

    if (!containerNo || !Array.isArray(events)) {
      throw new FourPortunException(
        ErrorCode.FOURPORTUN_DATA_ERROR,
        'Webhook payload format invalid',
      );
    }

    // 标准化事件数据
    const normalizedEvents = events.map(event => ({
      ...event,
      nodeCode: this.mapNodeCode(event.nodeCode),
      eventTime: new Date(event.eventTime),
    }));

    return {
      containerNo,
      events: normalizedEvents,
      timestamp,
      normalizedData: {
        containerNo,
        events: normalizedEvents,
        receivedAt: new Date().toISOString(),
      },
    };
  }

  // ==================== 数据映射 ====================

  /**
   * 标准化跟踪数据
   */
  private normalizeTrackingData(data: ContainerTrackingData): ContainerTrackingData {
    return {
      ...data,
      carrierCode: this.mapCarrierCode(data.carrierCode),
      originPort: this.mapPortCode(data.originPort),
      destinationPort: this.mapPortCode(data.destinationPort),
      status: this.mapStatus(data.status),
      nodes: data.nodes?.map(node => ({
        ...node,
        nodeCode: this.mapNodeCode(node.nodeCode),
        locationCode: this.mapPortCode(node.locationCode),
      })),
    };
  }

  /**
   * 映射船司代码
   */
  private mapCarrierCode(code?: string): string | undefined {
    if (!code) return undefined;
    return CARRIER_CODE_MAP[code] || code;
  }

  /**
   * 映射港口代码
   */
  private mapPortCode(code?: string): string | undefined {
    if (!code) return undefined;
    return PORT_CODE_MAP[code] || code;
  }

  /**
   * 映射节点代码
   */
  private mapNodeCode(code?: string): string | undefined {
    if (!code) return undefined;
    return NODE_CODE_MAP[code] || code;
  }

  /**
   * 映射状态
   */
  private mapStatus(status?: string): string | undefined {
    if (!status) return undefined;
    return STATUS_MAP[status] || status;
  }

  // ==================== 错误处理 ====================

  /**
   * 执行带重试的操作
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < FOURPORTUN_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 如果是认证错误，清除token并重试
        if (error instanceof FourPortunException && 
            error.code === ErrorCode.FOURPORTUN_AUTH_FAILED) {
          this.clearToken();
        }

        // 如果是客户端错误（4xx），不重试
        if (error instanceof HttpException) {
          const status = error.getStatus();
          if (status >= 400 && status < 500) {
            throw error;
          }
        }

        if (attempt < FOURPORTUN_CONFIG.MAX_RETRIES - 1) {
          const delay = Math.min(
            FOURPORTUN_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt),
            FOURPORTUN_CONFIG.RETRY_DELAY_MAX,
          );
          this.logger.warn(`API request failed (attempt ${attempt + 1}), retrying in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error('API request failed after max retries', lastError?.stack);
    throw new FourPortunException(
      ErrorCode.FOURPORTUN_API_ERROR,
      '4Portun API请求失败',
      { error: lastError?.message },
    );
  }

  /**
   * 处理 API 错误
   */
  private async handleApiError(error: AxiosError): Promise<never> {
    if (error.response) {
      const { status, data } = error.response;
      const errorData = data as any;

      // Token 过期，清除token让下次自动刷新
      if (status === 401) {
        this.clearToken();
        throw new FourPortunException(
          ErrorCode.FOURPORTUN_AUTH_FAILED,
          errorData?.message || '认证失败，Token已过期',
          { status },
        );
      }

      // 限流
      if (status === 429) {
        throw new FourPortunException(
          ErrorCode.FOURPORTUN_RATE_LIMIT,
          '请求频率超限',
          { status },
        );
      }

      throw new HttpException(
        errorData?.message || '4Portun API error',
        status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (error.request) {
      // 请求已发出但没有收到响应
      throw new FourPortunException(
        ErrorCode.FOURPORTUN_API_ERROR,
        '无法连接到4Portun API',
        { error: error.message },
      );
    }

    // 请求配置出错
    throw new FourPortunException(
      ErrorCode.FOURPORTUN_API_ERROR,
      '请求配置错误',
      { error: error.message },
    );
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
