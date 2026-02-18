/**
 * 内部系统服务
 * 处理内部系统数据推送逻辑
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, PushStatus, Prisma } from '@prisma/client';
import { WinstonLoggerService } from '../../common/logger/winston-logger.service';
import { PushContainersDto, ContainerDataDto, PushSource } from './dto/push-containers.dto';
import { UpdateSubscriptionDto, SubscriptionItemDto, SubscriptionAction } from './dto/update-subscription.dto';

@Injectable()
export class InternalService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: WinstonLoggerService,
  ) {}

  async onModuleInit() {
    this.logger.setContext('InternalService');
    this.logger.log('InternalService initialized');
  }

  // ==================== 推送集装箱数据 ====================

  /**
   * 推送集装箱数据
   */
  async pushContainers(dto: PushContainersDto): Promise<{
    success: boolean;
    message: string;
    data: {
      total: number;
      success: number;
      failed: number;
      records: Array<{
        containerNo: string;
        status: string;
        message: string;
        recordId?: string;
      }>;
    };
  }> {
    const { containers, source, pushType = 'api', metadata } = dto;
    
    this.logger.log(`Received push request for ${containers.length} containers from ${source}`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const container of containers) {
      try {
        const result = await this.processContainerPush(container, source, pushType, metadata);
        results.push(result);
        if (result.status === 'success') {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to process container ${container.containerNo}`, (error as Error).stack);
        results.push({
          containerNo: container.containerNo,
          status: 'failed',
          message: (error as Error).message,
        });
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      message: `Processed ${containers.length} containers: ${successCount} success, ${failedCount} failed`,
      data: {
        total: containers.length,
        success: successCount,
        failed: failedCount,
        records: results,
      },
    };
  }

  /**
   * 处理单个集装箱推送
   */
  private async processContainerPush(
    container: ContainerDataDto,
    source: PushSource,
    pushType: string,
    metadata?: Record<string, any>,
  ): Promise<{
    containerNo: string;
    status: string;
    message: string;
    recordId?: string;
  }> {
    const { containerNo } = container;

    // 查找对应的货物
    let shipment = await this.prisma.shipment.findUnique({
      where: { containerNo },
    });

    // 创建推送记录
    const pushRecord = await this.prisma.internalPushRecord.create({
      data: {
        containerNo,
        shipmentId: shipment?.id,
        source,
        pushType,
        status: PushStatus.PENDING,
        payload: container as any,
      },
    });

    try {
      // 更新货物数据
      if (shipment) {
        shipment = await this.updateShipmentFromPush(shipment.id, container);
      } else {
        // 如果没有找到货物记录，可以选择创建或跳过
        this.logger.warn(`Shipment not found for container: ${containerNo}, skipping data update`);
      }

      // 更新推送记录为成功
      await this.prisma.internalPushRecord.update({
        where: { id: pushRecord.id },
        data: {
          status: PushStatus.SUCCESS,
          pushedAt: new Date(),
          response: {
            success: true,
            message: 'Data processed successfully',
          },
        },
      });

      // 更新订阅的推送统计
      await this.updateSubscriptionPushStats(containerNo);

      return {
        containerNo,
        status: 'success',
        message: 'Container data processed successfully',
        recordId: pushRecord.id,
      };
    } catch (error) {
      // 更新推送记录为失败
      await this.prisma.internalPushRecord.update({
        where: { id: pushRecord.id },
        data: {
          status: PushStatus.FAILED,
          errorMsg: (error as Error).message,
          pushedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * 根据推送数据更新货物
   */
  private async updateShipmentFromPush(
    shipmentId: string,
    container: ContainerDataDto,
  ) {
    const updateData: Prisma.ShipmentUpdateInput = {
      containerType: container.containerType,
      blNo: container.blNo,
      bookingNo: container.bookingNo,
      carrierCode: container.carrierCode,
      carrierName: container.carrierName,
      originPort: container.originPort,
      originPortName: container.originPort,
      destinationPort: container.destinationPort,
      destinationPortName: container.destinationPort,
      etd: container.etd ? new Date(container.etd) : undefined,
      eta: container.eta ? new Date(container.eta) : undefined,
      atd: container.atd ? new Date(container.atd) : undefined,
      ata: container.ata ? new Date(container.ata) : undefined,
      lastSyncAt: new Date(),
    };

    // 更新货物
    const shipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: updateData,
    });

    // 保存节点数据
    if (container.nodes && container.nodes.length > 0) {
      for (const node of container.nodes) {
        await this.prisma.shipmentNode.upsert({
          where: {
            shipmentId_nodeCode_eventTime: {
              shipmentId: shipmentId,
              nodeCode: node.nodeCode,
              eventTime: new Date(node.eventTime),
            },
          },
          update: {
            nodeName: node.nodeName,
            location: node.location,
            description: node.description,
            operator: node.operator,
            rawData: node as any,
          },
          create: {
            shipmentId: shipmentId,
            nodeCode: node.nodeCode,
            nodeName: node.nodeName,
            location: node.location,
            eventTime: new Date(node.eventTime),
            description: node.description,
            operator: node.operator,
            source: 'internal_push',
            rawData: node as any,
          },
        });
      }

      // 更新当前节点
      const latestNode = container.nodes[container.nodes.length - 1];
      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          currentNode: latestNode.nodeCode,
        },
      });
    }

    return shipment;
  }

  /**
   * 更新订阅推送统计
   */
  private async updateSubscriptionPushStats(containerNo: string): Promise<void> {
    try {
      await this.prisma.containerSubscription.updateMany({
        where: { containerNo },
        data: {
          totalPushes: { increment: 1 },
          lastPushAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to update subscription stats for ${containerNo}: ${(error as Error).message}`);
    }
  }

  // ==================== 订阅管理 ====================

  /**
   * 批量更新订阅
   */
  async updateSubscriptions(dto: UpdateSubscriptionDto): Promise<{
    success: boolean;
    message: string;
    data: {
      total: number;
      success: number;
      failed: number;
      results: Array<{
        containerNo: string;
        action: string;
        status: string;
        message: string;
      }>;
    };
  }> {
    const { items } = dto;
    
    this.logger.log(`Processing ${items.length} subscription updates`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of items) {
      try {
        const result = await this.processSubscriptionUpdate(item);
        results.push(result);
        if (result.status === 'success') {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to process subscription for ${item.containerNo}`, (error as Error).stack);
        results.push({
          containerNo: item.containerNo,
          action: item.action,
          status: 'failed',
          message: (error as Error).message,
        });
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      message: `Processed ${items.length} subscriptions: ${successCount} success, ${failedCount} failed`,
      data: {
        total: items.length,
        success: successCount,
        failed: failedCount,
        results,
      },
    };
  }

  /**
   * 处理单个订阅更新
   */
  private async processSubscriptionUpdate(
    item: SubscriptionItemDto,
  ): Promise<{
    containerNo: string;
    action: string;
    status: string;
    message: string;
  }> {
    const { containerNo, action, companyId, autoSync, syncInterval, remark } = item;

    // 查找对应的货物
    const shipment = await this.prisma.shipment.findUnique({
      where: { containerNo },
    });

    switch (action) {
      case SubscriptionAction.SUBSCRIBE:
        await this.prisma.containerSubscription.upsert({
          where: { containerNo },
          update: {
            isSubscribed: true,
            subscribedAt: new Date(),
            unsubscribedAt: null,
            companyId: companyId || shipment?.companyId,
            shipmentId: shipment?.id,
            autoSync: autoSync ?? true,
            syncInterval: syncInterval ?? 300,
            remark,
          },
          create: {
            containerNo,
            shipmentId: shipment?.id,
            companyId: companyId || shipment?.companyId,
            isSubscribed: true,
            subscribedAt: new Date(),
            autoSync: autoSync ?? true,
            syncInterval: syncInterval ?? 300,
            remark,
          },
        });
        return {
          containerNo,
          action,
          status: 'success',
          message: 'Subscribed successfully',
        };

      case SubscriptionAction.UNSUBSCRIBE:
        await this.prisma.containerSubscription.updateMany({
          where: { containerNo },
          data: {
            isSubscribed: false,
            unsubscribedAt: new Date(),
            externalSubscribed: false,
          },
        });
        return {
          containerNo,
          action,
          status: 'success',
          message: 'Unsubscribed successfully',
        };

      case SubscriptionAction.UPDATE:
        await this.prisma.containerSubscription.updateMany({
          where: { containerNo },
          data: {
            companyId: companyId || undefined,
            autoSync: autoSync ?? undefined,
            syncInterval: syncInterval ?? undefined,
            remark: remark ?? undefined,
          },
        });
        return {
          containerNo,
          action,
          status: 'success',
          message: 'Updated successfully',
        };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * 查询订阅列表
   */
  async getSubscriptions(query: {
    containerNo?: string;
    companyId?: string;
    isSubscribed?: boolean;
    externalSubscribed?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      containerNo,
      companyId,
      isSubscribed,
      externalSubscribed,
      page = 1,
      pageSize = 20,
    } = query;

    const where: Prisma.ContainerSubscriptionWhereInput = {};

    if (containerNo) {
      where.containerNo = { contains: containerNo };
    }
    if (companyId) {
      where.companyId = companyId;
    }
    if (isSubscribed !== undefined) {
      where.isSubscribed = isSubscribed;
    }
    if (externalSubscribed !== undefined) {
      where.externalSubscribed = externalSubscribed;
    }

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

  // ==================== 推送记录查询 ====================

  /**
   * 查询推送记录
   */
  async getPushRecords(query: {
    containerNo?: string;
    status?: PushStatus;
    source?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      containerNo,
      status,
      source,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = query;

    const where: Prisma.InternalPushRecordWhereInput = {};

    if (containerNo) {
      where.containerNo = { contains: containerNo };
    }
    if (status) {
      where.status = status;
    }
    if (source) {
      where.source = source;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.internalPushRecord.findMany({
        where,
        include: {
          shipment: {
            select: {
              id: true,
              shipmentNo: true,
              status: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.internalPushRecord.count({ where }),
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
}
