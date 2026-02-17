import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly syncService: SyncService,
  ) {}

  /**
   * 查询集装箱跟踪信息
   */
  async trackContainer(containerNo: string, companyId?: string) {
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
        if (!shipment) {
          throw new NotFoundException('未找到该集装箱的跟踪信息');
        }
      }
    }

    return shipment;
  }

  /**
   * 查询提单跟踪信息
   */
  async trackByBlNo(blNo: string) {
    const shipments = await this.prisma.shipment.findMany({
      where: { blNo },
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

    return shipments;
  }

  /**
   * 获取企业货物列表
   */
  async getCompanyShipments(companyId: string, query: any) {
    const { page = 1, pageSize = 20, status, keyword } = query;
    
    const where: any = { companyId };
    
    if (status) {
      where.status = status;
    }
    
    if (keyword) {
      where.OR = [
        { containerNo: { contains: keyword } },
        { blNo: { contains: keyword } },
        { shipName: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: {
          nodes: {
            orderBy: { eventTime: 'desc' },
            take: 1,
          },
          order: {
            select: {
              id: true,
              orderNo: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取货物详情
   */
  async getShipmentDetail(id: string) {
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
        order: {
          select: {
            id: true,
            orderNo: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('货物不存在');
    }

    return shipment;
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
