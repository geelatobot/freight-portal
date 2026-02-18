/**
 * 任务 1.2.3: 同步策略实现 - 同步服务
 * 实现定时任务同步、Webhook数据处理和缓存策略
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { WinstonLoggerService } from '../../../common/logger/winston-logger.service';
import { FourPortunService } from './fourportun.service';
import { ErrorCode } from '../../../common/constants/error-codes';
import { BusinessException } from '../../../common/exceptions/business.exception';

/**
 * 同步结果接口
 */
interface SyncResult {
  containerNo: string;
  success: boolean;
  message: string;
  eventCount?: number;
  updatedAt?: Date;
}

/**
 * Webhook 处理结果
 */
interface WebhookProcessResult {
  containerNo: string;
  eventCount: number;
  updatedAt: Date;
}

@Injectable()
export class SyncService implements OnModuleInit {
  constructor(
    private readonly fourPortunService: FourPortunService,
    private readonly logger: WinstonLoggerService,
    private readonly prisma: PrismaClient,
  ) {}

  async onModuleInit() {
    this.logger.setContext('SyncService');
    this.logger.log('SyncService initialized');
  }

  // ==================== 定时任务同步 ====================

  /**
   * 每5分钟同步在途货物
   * 只同步状态不是已完成或已取消的货物
   */
  @Interval(5 * 60 * 1000)  // 5分钟
  async syncInTransitShipments(): Promise<void> {
    this.logger.log('Starting scheduled sync for in-transit shipments');

    try {
      // 获取需要同步的货物列表
      const shipments = await this.prisma.shipment.findMany({
        where: {
          status: {
            notIn: [ShipmentStatus.COMPLETED, ShipmentStatus.EMPTY_RETURN],
          },
          syncSource: '4portun',
        },
        select: {
          id: true,
          containerNo: true,
          companyId: true,
          lastSyncAt: true,
        },
        take: 100, // 每次最多同步100个
      });

      if (shipments.length === 0) {
        this.logger.log('No shipments to sync');
        return;
      }

      this.logger.log(`Found ${shipments.length} shipments to sync`);

      // 批量获取跟踪数据
      const containerNos = shipments.map(s => s.containerNo);
      const batchSize = 50; // 4Portun 单次最多支持50个

      for (let i = 0; i < containerNos.length; i += batchSize) {
        const batch = containerNos.slice(i, i + batchSize);
        
        try {
          const trackingData = await this.fourPortunService.batchTrackContainers(batch);
          
          // 同步每个集装箱的数据
          for (const data of trackingData) {
            const shipment = shipments.find(s => s.containerNo === data.containerNo);
            if (shipment) {
              await this.syncShipmentData(shipment.id, data, shipment.companyId);
            }
          }

          // 记录成功日志
          await this.logSyncBatch(batch, true, 'Sync successful');
        } catch (error) {
          this.logger.error(`Failed to sync batch: ${batch.join(', ')}`, (error as Error).stack);
          
          // 记录失败日志
          await this.logSyncBatch(batch, false, (error as Error).message);
        }
      }

      this.logger.log('Scheduled sync completed');
    } catch (error) {
      this.logger.error('Scheduled sync failed', (error as Error).stack);
    }
  }

  /**
   * 每日凌晨同步所有货物（全量同步）
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyFullSync(): Promise<void> {
    this.logger.log('Starting daily full sync');

    try {
      const shipments = await this.prisma.shipment.findMany({
        where: {
          syncSource: '4portun',
        },
        select: {
          id: true,
          containerNo: true,
          companyId: true,
        },
      });

      this.logger.log(`Daily full sync: ${shipments.length} shipments`);

      // 分批处理
      const batchSize = 50;
      for (let i = 0; i < shipments.length; i += batchSize) {
        const batch = shipments.slice(i, i + batchSize);
        const containerNos = batch.map(s => s.containerNo);

        try {
          const trackingData = await this.fourPortunService.batchTrackContainers(containerNos);
          
          for (const data of trackingData) {
            const shipment = batch.find(s => s.containerNo === data.containerNo);
            if (shipment) {
              await this.syncShipmentData(shipment.id, data, shipment.companyId);
            }
          }
        } catch (error) {
          this.logger.error(`Daily sync batch failed: ${containerNos.join(', ')}`, (error as Error).stack);
        }

        // 添加延迟避免限流
        if (i + batchSize < shipments.length) {
          await this.sleep(1000);
        }
      }

      this.logger.log('Daily full sync completed');
    } catch (error) {
      this.logger.error('Daily full sync failed', (error as Error).stack);
    }
  }

  // ==================== Webhook 处理 ====================

  /**
   * 从 Webhook 数据同步
   */
  async syncFromWebhook(processedData: {
    containerNo: string;
    events: any[];
    timestamp: string;
    normalizedData: any;
  }): Promise<WebhookProcessResult> {
    const { containerNo, events } = processedData;

    // 查找对应的货物
    const shipment = await this.prisma.shipment.findUnique({
      where: { containerNo },
    });

    if (!shipment) {
      this.logger.warn(`Shipment not found for container: ${containerNo}`);
      throw new BusinessException(
        ErrorCode.DATA_NOT_EXIST,
        `集装箱 ${containerNo} 未找到对应的货物记录`,
      );
    }

    // 保存节点数据
    let eventCount = 0;
    for (const event of events) {
      try {
        await this.prisma.shipmentNode.upsert({
          where: {
            shipmentId_nodeCode_eventTime: {
              shipmentId: shipment.id,
              nodeCode: event.nodeCode,
              eventTime: event.eventTime,
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
            eventTime: event.eventTime,
            description: event.description,
            operator: event.operator,
            source: '4portun',
            rawData: event,
          },
        });
        eventCount++;
      } catch (error) {
        this.logger.error(`Failed to save node for ${containerNo}`, (error as Error).stack);
      }
    }

    // 更新货物当前状态
    const latestEvent = events[events.length - 1];
    const updatedShipment = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        currentNode: latestEvent?.nodeCode,
        lastSyncAt: new Date(),
        status: this.mapStatus(latestEvent?.nodeCode),
      },
    });

    // 记录同步日志
    await this.logSyncEvent(shipment.id, 'webhook', true, `Processed ${eventCount} events`);

    return {
      containerNo,
      eventCount,
      updatedAt: updatedShipment.updatedAt,
    };
  }

  // ==================== 手动同步 ====================

  /**
   * 手动同步单个集装箱
   */
  async syncContainer(containerNo: string, companyId?: string): Promise<SyncResult> {
    this.logger.log(`Manual sync requested for container: ${containerNo}`);

    try {
      // 从 4Portun 获取数据
      const trackingData = await this.fourPortunService.trackContainer(containerNo);

      // 查找或创建货物记录
      let shipment = await this.prisma.shipment.findUnique({
        where: { containerNo },
      });

      if (!shipment) {
        // 创建新货物记录
        shipment = await this.prisma.shipment.create({
          data: {
            shipmentNo: `SH${Date.now()}`,
            containerNo,
            containerType: trackingData.containerType || '20GP',
            companyId: companyId || '',
            blNo: trackingData.blNo,
            bookingNo: trackingData.bookingNo,
            carrierCode: trackingData.carrierCode,
            carrierName: trackingData.carrierName,
            originPort: trackingData.originPort || '',
            originPortName: trackingData.originPort || '',
            destinationPort: trackingData.destinationPort || '',
            destinationPortName: trackingData.destinationPort || '',
            etd: trackingData.etd ? new Date(trackingData.etd) : null,
            eta: trackingData.eta ? new Date(trackingData.eta) : null,
            atd: trackingData.atd ? new Date(trackingData.atd) : null,
            ata: trackingData.ata ? new Date(trackingData.ata) : null,
            status: this.mapStatus(trackingData.status),
            currentNode: trackingData.nodes?.[trackingData.nodes.length - 1]?.nodeCode,
            syncSource: '4portun',
            lastSyncAt: new Date(),
          },
        });
      } else {
        // 更新现有记录
        shipment = await this.prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            blNo: trackingData.blNo || shipment.blNo,
            bookingNo: trackingData.bookingNo || shipment.bookingNo,
            carrierCode: trackingData.carrierCode || shipment.carrierCode,
            carrierName: trackingData.carrierName || shipment.carrierName,
            etd: trackingData.etd ? new Date(trackingData.etd) : shipment.etd,
            eta: trackingData.eta ? new Date(trackingData.eta) : shipment.eta,
            atd: trackingData.atd ? new Date(trackingData.atd) : shipment.atd,
            ata: trackingData.ata ? new Date(trackingData.ata) : shipment.ata,
            status: this.mapStatus(trackingData.status) || shipment.status,
            currentNode: trackingData.nodes?.[trackingData.nodes.length - 1]?.nodeCode,
            lastSyncAt: new Date(),
          },
        });
      }

      // 保存节点数据
      let eventCount = 0;
      if (trackingData.nodes && trackingData.nodes.length > 0) {
        for (const node of trackingData.nodes) {
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
              rawData: node as any,
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
              rawData: node as any,
            },
          });
          eventCount++;
        }
      }

      // 记录同步日志
      await this.logSyncEvent(shipment.id, 'manual', true, `Synced ${eventCount} events`);

      this.logger.log(`Manual sync completed for container: ${containerNo}`);

      return {
        containerNo,
        success: true,
        message: 'Sync successful',
        eventCount,
        updatedAt: shipment.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Manual sync failed for container: ${containerNo}`, (error as Error).stack);
      
      // 记录失败日志
      const shipment = await this.prisma.shipment.findUnique({
        where: { containerNo },
      });
      if (shipment) {
        await this.logSyncEvent(shipment.id, 'manual', false, (error as Error).message);
      }

      return {
        containerNo,
        success: false,
        message: (error as Error).message,
      };
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 同步货物数据（内部使用）
   */
  private async syncShipmentData(
    shipmentId: string, 
    data: any, 
    companyId: string,
  ): Promise<void> {
    try {
      // 更新货物基本信息
      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          blNo: data.blNo,
          bookingNo: data.bookingNo,
          carrierCode: data.carrierCode,
          carrierName: data.carrierName,
          originPort: data.originPort,
          originPortName: data.originPort,
          destinationPort: data.destinationPort,
          destinationPortName: data.destinationPort,
          etd: data.etd ? new Date(data.etd) : undefined,
          eta: data.eta ? new Date(data.eta) : undefined,
          atd: data.atd ? new Date(data.atd) : undefined,
          ata: data.ata ? new Date(data.ata) : undefined,
          status: this.mapStatus(data.status),
          currentNode: data.nodes?.[data.nodes.length - 1]?.nodeCode,
          lastSyncAt: new Date(),
        },
      });

      // 保存节点数据
      if (data.nodes && data.nodes.length > 0) {
        for (const node of data.nodes) {
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
              source: '4portun',
              rawData: node as any,
            },
          });
        }
      }

      // 记录成功日志
      await this.logSyncEvent(shipmentId, 'scheduled', true, 'Sync successful');
    } catch (error) {
      this.logger.error(`Failed to sync shipment ${shipmentId}`, (error as Error).stack);
      await this.logSyncEvent(shipmentId, 'scheduled', false, (error as Error).message);
    }
  }

  /**
   * 记录同步事件
   */
  private async logSyncEvent(
    shipmentId: string,
    syncType: string,
    success: boolean,
    message: string,
  ): Promise<void> {
    try {
      await this.prisma.syncLog.create({
        data: {
          shipmentId,
          syncType,
          status: success ? 'SUCCESS' : 'FAILED',
          message,
          syncedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to create sync log', (error as Error).stack);
    }
  }

  /**
   * 记录批量同步日志
   */
  private async logSyncBatch(
    containerNos: string[],
    success: boolean,
    message: string,
  ): Promise<void> {
    try {
      await this.prisma.syncLog.createMany({
        data: containerNos.map(containerNo => ({
          shipmentId: containerNo, // 临时使用containerNo
          syncType: 'batch',
          status: success ? 'SUCCESS' : 'FAILED',
          message,
          syncedAt: new Date(),
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.error('Failed to create batch sync log', (error as Error).stack);
    }
  }

  /**
   * 状态映射
   */
  private mapStatus(status?: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      'BOOKED': ShipmentStatus.BOOKED,
      'EMPTY_PICKUP': ShipmentStatus.EMPTY_PICKUP,
      'GATE_IN': ShipmentStatus.GATE_IN,
      'CUSTOMS_RELEASED': ShipmentStatus.CUSTOMS_RELEASED,
      'TERMINAL_RELEASED': ShipmentStatus.TERMINAL_RELEASED,
      'DEPARTURE': ShipmentStatus.DEPARTURE,
      'ARRIVAL': ShipmentStatus.ARRIVAL,
      'DISCHARGED': ShipmentStatus.DISCHARGED,
      'FULL_PICKUP': ShipmentStatus.FULL_PICKUP,
      'EMPTY_RETURN': ShipmentStatus.EMPTY_RETURN,
      'COMPLETED': ShipmentStatus.COMPLETED,
    };
    return statusMap[status || ''] || ShipmentStatus.BOOKED;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
