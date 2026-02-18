import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SyncService } from '../sync/services/sync.service';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly syncService: SyncService,
  ) {}

  /**
   * 批量跟踪集装箱
   */
  async batchTrack(containerNos: string[], companyId?: string) {
    const results = await Promise.all(
      containerNos.map(async (containerNo) => {
        try {
          // 先尝试从本地数据库查询
          let shipment = await this.prisma.shipment.findUnique({
            where: { containerNo },
            include: {
              nodes: {
                orderBy: { eventTime: 'desc' },
              },
              company: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          });

          // 如果本地没有数据或数据过期，从4portun同步
          const needSync = !shipment || this.isDataStale(shipment.lastSyncAt);
          
          if (needSync) {
            try {
              await this.syncService.syncContainer(containerNo, companyId);
              // 重新查询以获取完整数据
              shipment = await this.prisma.shipment.findUnique({
                where: { containerNo },
                include: {
                  nodes: {
                    orderBy: { eventTime: 'desc' },
                  },
                  company: {
                    select: {
                      id: true,
                      companyName: true,
                    },
                  },
                },
              });
            } catch (error) {
              // 同步失败但本地有数据，返回本地数据
            }
          }

          return {
            containerNo,
            found: !!shipment,
            data: shipment,
          };
        } catch (error) {
          return {
            containerNo,
            found: false,
            error: (error as Error).message,
          };
        }
      }),
    );

    return {
      total: containerNos.length,
      found: results.filter(r => r.found).length,
      results,
    };
  }

  /**
   * 获取货物跟踪历史
   */
  async getTrackingHistory(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { eventTime: 'desc' },
        },
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('货物不存在');
    }

    return {
      shipment: {
        id: shipment.id,
        containerNo: shipment.containerNo,
        blNo: shipment.blNo,
        status: shipment.status,
        currentNode: shipment.currentNode,
      },
      history: shipment.nodes,
    };
  }

  /**
   * 订阅货物更新
   */
  async subscribeShipment(containerNo: string, userId: string, options: {
    email?: string;
    phone?: string;
  }) {
    // 创建或更新订阅记录
    const subscription = await this.prisma.shipmentSubscription.upsert({
      where: {
        userId_containerNo: {
          userId,
          containerNo,
        },
      },
      update: {
        email: options.email,
        phone: options.phone,
        notifyOnUpdate: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        containerNo,
        email: options.email,
        phone: options.phone,
        notifyOnUpdate: true,
      },
    });

    return {
      message: '订阅成功',
      subscription: {
        id: subscription.id,
        containerNo: subscription.containerNo,
        notifyOnUpdate: subscription.notifyOnUpdate,
        createdAt: subscription.createdAt,
      },
    };
  }

  /**
   * 判断数据是否过期（超过1小时）
   */
  private isDataStale(lastSyncAt: Date | null): boolean {
    if (!lastSyncAt) return true;
    const oneHour = 60 * 60 * 1000;
    return Date.now() - lastSyncAt.getTime() > oneHour;
  }
}
