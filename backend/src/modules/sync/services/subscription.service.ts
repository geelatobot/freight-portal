/**
 * 订阅管理服务
 * 管理 ContainerSubscription 的 CRUD
 * 自动调用 4portun API 进行订阅/取消订阅
 * 定时同步订阅的集装箱数据
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { PrismaClient, ContainerSubscription, ShipmentStatus } from '@prisma/client';
import { WinstonLoggerService } from '../../../common/logger/winston-logger.service';
import { FourPortunService } from './fourportun.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fourPortunService: FourPortunService,
    private readonly configService: ConfigService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async onModuleInit() {
    this.logger.setContext('SubscriptionService');
    this.logger.log('SubscriptionService initialized');
  }

  // ==================== CRUD 操作 ====================

  /**
   * 创建订阅
   */
  async createSubscription(data: {
    containerNo: string;
    shipmentId?: string;
    companyId?: string;
    autoSync?: boolean;
    syncInterval?: number;
    remark?: string;
  }): Promise<ContainerSubscription> {
    const { containerNo, shipmentId, companyId, autoSync = true, syncInterval = 300, remark } = data;

    this.logger.log(`Creating subscription for container: ${containerNo}`);

    // 检查是否已存在
    const existing = await this.prisma.containerSubscription.findUnique({
      where: { containerNo },
    });

    if (existing) {
      throw new Error(`Subscription already exists for container: ${containerNo}`);
    }

    // 查找对应的货物
    let shipment = shipmentId
      ? await this.prisma.shipment.findUnique({ where: { id: shipmentId } })
      : await this.prisma.shipment.findUnique({ where: { containerNo } });

    // 创建订阅记录
    const subscription = await this.prisma.containerSubscription.create({
      data: {
        containerNo,
        shipmentId: shipment?.id,
        companyId: companyId || shipment?.companyId,
        isSubscribed: true,
        subscribedAt: new Date(),
        autoSync,
        syncInterval,
        nextSyncAt: new Date(Date.now() + syncInterval * 1000),
        remark,
      },
    });

    // 调用 4portun API 进行订阅
    try {
      const webhookBaseUrl = this.configService.get('WEBHOOK_BASE_URL');
      const callbackUrl = webhookBaseUrl ? `${webhookBaseUrl}/webhooks/4portun` : undefined;
      
      const result = await this.fourPortunService.subscribeTracking(containerNo, callbackUrl);
      
      // 更新外部订阅状态
      await this.prisma.containerSubscription.update({
        where: { id: subscription.id },
        data: {
          externalSubscribed: true,
          externalSubId: result?.subscriptionId || result?.id,
        },
      });

      this.logger.log(`Successfully subscribed to 4portun for container: ${containerNo}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to 4portun for container: ${containerNo}`,
        (error as Error).stack,
      );
      // 不抛出错误，因为本地订阅已创建
    }

    return subscription;
  }

  /**
   * 更新订阅
   */
  async updateSubscription(
    id: string,
    data: {
      autoSync?: boolean;
      syncInterval?: number;
      remark?: string;
    },
  ): Promise<ContainerSubscription> {
    this.logger.log(`Updating subscription: ${id}`);

    const subscription = await this.prisma.containerSubscription.update({
      where: { id },
      data: {
        ...data,
        nextSyncAt: data.syncInterval
          ? new Date(Date.now() + data.syncInterval * 1000)
          : undefined,
      },
    });

    return subscription;
  }

  /**
   * 删除订阅
   */
  async deleteSubscription(id: string): Promise<void> {
    this.logger.log(`Deleting subscription: ${id}`);

    const subscription = await this.prisma.containerSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new Error(`Subscription not found: ${id}`);
    }

    // 调用 4portun API 取消订阅
    if (subscription.externalSubscribed) {
      try {
        await this.fourPortunService.unsubscribeTracking(subscription.containerNo);
        this.logger.log(`Unsubscribed from 4portun for container: ${subscription.containerNo}`);
      } catch (error) {
        this.logger.error(
          `Failed to unsubscribe from 4portun for container: ${subscription.containerNo}`,
          (error as Error).stack,
        );
        // 继续删除本地记录
      }
    }

    // 删除本地订阅记录
    await this.prisma.containerSubscription.delete({
      where: { id },
    });
  }

  /**
   * 根据集装箱号取消订阅
   */
  async unsubscribeByContainerNo(containerNo: string): Promise<void> {
    this.logger.log(`Unsubscribing container: ${containerNo}`);

    const subscription = await this.prisma.containerSubscription.findUnique({
      where: { containerNo },
    });

    if (!subscription) {
      throw new Error(`Subscription not found for container: ${containerNo}`);
    }

    // 调用 4portun API 取消订阅
    if (subscription.externalSubscribed) {
      try {
        await this.fourPortunService.unsubscribeTracking(containerNo);
      } catch (error) {
        this.logger.error(
          `Failed to unsubscribe from 4portun for container: ${containerNo}`,
          (error as Error).stack,
        );
      }
    }

    // 更新本地订阅状态
    await this.prisma.containerSubscription.update({
      where: { id: subscription.id },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
        externalSubscribed: false,
      },
    });
  }

  /**
   * 获取订阅详情
   */
  async getSubscription(id: string): Promise<ContainerSubscription | null> {
    return this.prisma.containerSubscription.findUnique({
      where: { id },
      include: {
        shipment: {
          select: {
            id: true,
            shipmentNo: true,
            status: true,
            currentNode: true,
            containerNo: true,
          },
        },
      },
    });
  }

  /**
   * 根据集装箱号获取订阅
   */
  async getSubscriptionByContainerNo(containerNo: string): Promise<ContainerSubscription | null> {
    return this.prisma.containerSubscription.findUnique({
      where: { containerNo },
      include: {
        shipment: {
          select: {
            id: true,
            shipmentNo: true,
            status: true,
            currentNode: true,
          },
        },
      },
    });
  }

  /**
   * 获取订阅列表
   */
  async getSubscriptions(params: {
    isSubscribed?: boolean;
    externalSubscribed?: boolean;
    companyId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: ContainerSubscription[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { isSubscribed, externalSubscribed, companyId, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (isSubscribed !== undefined) where.isSubscribed = isSubscribed;
    if (externalSubscribed !== undefined) where.externalSubscribed = externalSubscribed;
    if (companyId) where.companyId = companyId;

    const [data, total] = await Promise.all([
      this.prisma.containerSubscription.findMany({
        where,
        include: {
          shipment: {
            select: {
              id: true,
              shipmentNo: true,
              status: true,
              currentNode: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.containerSubscription.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ==================== 4portun API 订阅管理 ====================

  /**
   * 同步外部订阅状态
   * 检查并修复本地与 4portun 的订阅状态不一致
   */
  async syncExternalSubscriptionStatus(containerNo: string): Promise<void> {
    this.logger.log(`Syncing external subscription status for: ${containerNo}`);

    const subscription = await this.prisma.containerSubscription.findUnique({
      where: { containerNo },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for container: ${containerNo}`);
      return;
    }

    try {
      // 尝试重新订阅（如果 4portun 中不存在订阅，会创建新的）
      const webhookBaseUrl = this.configService.get('WEBHOOK_BASE_URL');
      const callbackUrl = webhookBaseUrl ? `${webhookBaseUrl}/webhooks/4portun` : undefined;
      
      const result = await this.fourPortunService.subscribeTracking(containerNo, callbackUrl);
      
      // 更新外部订阅状态
      await this.prisma.containerSubscription.update({
        where: { id: subscription.id },
        data: {
          externalSubscribed: true,
          externalSubId: result?.subscriptionId || result?.id,
        },
      });

      this.logger.log(`Synced external subscription for container: ${containerNo}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync external subscription for container: ${containerNo}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * 批量重新订阅
   * 用于修复外部订阅状态不一致的情况
   */
  async batchResubscribe(): Promise<void> {
    this.logger.log('Starting batch resubscribe');

    const subscriptions = await this.prisma.containerSubscription.findMany({
      where: {
        isSubscribed: true,
        externalSubscribed: false,
      },
    });

    this.logger.log(`Found ${subscriptions.length} subscriptions to resubscribe`);

    for (const subscription of subscriptions) {
      try {
        await this.syncExternalSubscriptionStatus(subscription.containerNo);
        // 添加延迟避免限流
        await this.sleep(1000);
      } catch (error) {
        this.logger.error(
          `Failed to resubscribe container: ${subscription.containerNo}`,
          (error as Error).stack,
        );
      }
    }

    this.logger.log('Batch resubscribe completed');
  }

  // ==================== 定时同步 ====================

  /**
   * 每 5 分钟同步需要同步的订阅集装箱数据
   */
  @Interval(5 * 60 * 1000) // 5 分钟
  async syncSubscribedContainers(): Promise<void> {
    this.logger.log('Starting scheduled sync for subscribed containers');

    const now = new Date();

    // 获取需要同步的订阅（autoSync=true 且 nextSyncAt <= now）
    const subscriptions = await this.prisma.containerSubscription.findMany({
      where: {
        isSubscribed: true,
        autoSync: true,
        nextSyncAt: {
          lte: now,
        },
      },
      take: 50, // 每次最多同步 50 个
    });

    if (subscriptions.length === 0) {
      this.logger.log('No containers to sync');
      return;
    }

    this.logger.log(`Found ${subscriptions.length} containers to sync`);

    const containerNos = subscriptions.map((s) => s.containerNo);

    try {
      // 批量查询跟踪数据
      const trackingData = await this.fourPortunService.batchTrackContainers(containerNos);

      // 更新每个集装箱的数据
      for (const data of trackingData) {
        const subscription = subscriptions.find((s) => s.containerNo === data.containerNo);
        if (subscription) {
          await this.updateShipmentFromTracking(subscription, data);
        }
      }

      this.logger.log(`Synced ${trackingData.length} containers`);
    } catch (error) {
      this.logger.error('Failed to sync subscribed containers', (error as Error).stack);
    }
  }

  /**
   * 每日凌晨全量同步所有订阅的集装箱
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async dailyFullSync(): Promise<void> {
    this.logger.log('Starting daily full sync for all subscriptions');

    const subscriptions = await this.prisma.containerSubscription.findMany({
      where: {
        isSubscribed: true,
      },
    });

    this.logger.log(`Daily full sync: ${subscriptions.length} subscriptions`);

    // 分批处理
    const batchSize = 50;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      const containerNos = batch.map((s) => s.containerNo);

      try {
        const trackingData = await this.fourPortunService.batchTrackContainers(containerNos);

        for (const data of trackingData) {
          const subscription = batch.find((s) => s.containerNo === data.containerNo);
          if (subscription) {
            await this.updateShipmentFromTracking(subscription, data);
          }
        }
      } catch (error) {
        this.logger.error(
          `Daily sync batch failed: ${containerNos.join(', ')}`,
          (error as Error).stack,
        );
      }

      // 添加延迟避免限流
      if (i + batchSize < subscriptions.length) {
        await this.sleep(1000);
      }
    }

    this.logger.log('Daily full sync completed');
  }

  /**
   * 根据跟踪数据更新货物
   */
  private async updateShipmentFromTracking(
    subscription: ContainerSubscription,
    data: any,
  ): Promise<void> {
    try {
      // 查找或创建货物记录
      let shipment = subscription.shipmentId
        ? await this.prisma.shipment.findUnique({ where: { id: subscription.shipmentId } })
        : await this.prisma.shipment.findUnique({ where: { containerNo: subscription.containerNo } });

      if (!shipment) {
        // 如果没有货物记录，创建一个新的
        shipment = await this.prisma.shipment.create({
          data: {
            shipmentNo: `SH${Date.now()}`,
            containerNo: subscription.containerNo,
            containerType: data.containerType || '20GP',
            companyId: subscription.companyId || '',
            blNo: data.blNo,
            bookingNo: data.bookingNo,
            carrierCode: data.carrierCode,
            carrierName: data.carrierName,
            originPort: data.originPort || '',
            originPortName: data.originPort || '',
            destinationPort: data.destinationPort || '',
            destinationPortName: data.destinationPort || '',
            etd: data.etd ? new Date(data.etd) : null,
            eta: data.eta ? new Date(data.eta) : null,
            atd: data.atd ? new Date(data.atd) : null,
            ata: data.ata ? new Date(data.ata) : null,
            status: this.mapStatus(data.status),
            currentNode: data.nodes?.[data.nodes.length - 1]?.nodeCode,
            syncSource: '4portun',
            lastSyncAt: new Date(),
          },
        });

        // 更新订阅的 shipmentId
        await this.prisma.containerSubscription.update({
          where: { id: subscription.id },
          data: { shipmentId: shipment.id },
        });
      } else {
        // 更新现有货物记录
        await this.prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            blNo: data.blNo || shipment.blNo,
            bookingNo: data.bookingNo || shipment.bookingNo,
            carrierCode: data.carrierCode || shipment.carrierCode,
            carrierName: data.carrierName || shipment.carrierName,
            etd: data.etd ? new Date(data.etd) : shipment.etd,
            eta: data.eta ? new Date(data.eta) : shipment.eta,
            atd: data.atd ? new Date(data.atd) : shipment.atd,
            ata: data.ata ? new Date(data.ata) : shipment.ata,
            status: this.mapStatus(data.status) || shipment.status,
            currentNode: data.nodes?.[data.nodes.length - 1]?.nodeCode || shipment.currentNode,
            lastSyncAt: new Date(),
          },
        });
      }

      // 保存节点数据
      if (data.nodes && data.nodes.length > 0) {
        for (const node of data.nodes) {
          await this.prisma.shipmentNode.upsert({
            where: {
              shipmentId_nodeCode_eventTime: {
                shipmentId: shipment.id,
                nodeCode: node.nodeCode,
                eventTime: new Date(node.eventTime),
              },
            },
            update: {
              nodeName: node.nodeName,
              location: node.location,
              description: node.description,
              operator: node.operator,
              rawData: node,
            },
            create: {
              shipmentId: shipment.id,
              nodeCode: node.nodeCode,
              nodeName: node.nodeName,
              location: node.location,
              eventTime: new Date(node.eventTime),
              description: node.description,
              operator: node.operator,
              source: '4portun',
              rawData: node,
            },
          });
        }
      }

      // 更新订阅的同步时间
      const nextSyncAt = new Date(Date.now() + subscription.syncInterval * 1000);
      await this.prisma.containerSubscription.update({
        where: { id: subscription.id },
        data: {
          lastSyncAt: new Date(),
          nextSyncAt,
        },
      });

      this.logger.log(`Updated shipment for container: ${subscription.containerNo}`);
    } catch (error) {
      this.logger.error(
        `Failed to update shipment for container: ${subscription.containerNo}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * 状态映射
   */
  private mapStatus(status?: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      BOOKED: ShipmentStatus.BOOKED,
      EMPTY_PICKUP: ShipmentStatus.EMPTY_PICKUP,
      GATE_IN: ShipmentStatus.GATE_IN,
      CUSTOMS_RELEASED: ShipmentStatus.CUSTOMS_RELEASED,
      TERMINAL_RELEASED: ShipmentStatus.TERMINAL_RELEASED,
      DEPARTURE: ShipmentStatus.DEPARTURE,
      ARRIVAL: ShipmentStatus.ARRIVAL,
      DISCHARGED: ShipmentStatus.DISCHARGED,
      FULL_PICKUP: ShipmentStatus.FULL_PICKUP,
      EMPTY_RETURN: ShipmentStatus.EMPTY_RETURN,
      COMPLETED: ShipmentStatus.COMPLETED,
    };
    return statusMap[status || ''] || ShipmentStatus.BOOKED;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
