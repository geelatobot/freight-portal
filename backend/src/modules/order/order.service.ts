import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 生成订单号
   */
  private generateOrderNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${random}`;
  }

  /**
   * 创建订单
   */
  async create(userId: string, companyId: string, createOrderDto: CreateOrderDto) {
    const orderNo = this.generateOrderNo();

    const order = await this.prisma.order.create({
      data: {
        orderNo,
        companyId,
        creatorId: userId,
        type: createOrderDto.type,
        status: OrderStatus.PENDING,
        originPort: createOrderDto.originPort,
        originPortName: createOrderDto.originPort,
        destinationPort: createOrderDto.destinationPort,
        destinationPortName: createOrderDto.destinationPort,
        cargoDesc: createOrderDto.cargoDesc,
        cargoWeight: createOrderDto.cargoWeight,
        cargoVolume: createOrderDto.cargoVolume,
        cargoPackageType: createOrderDto.cargoPackageType,
        cargoPackageCount: createOrderDto.cargoPackageCount,
        containerType: createOrderDto.containerType,
        containerCount: createOrderDto.containerCount,
        etd: createOrderDto.etd ? new Date(createOrderDto.etd) : null,
        eta: createOrderDto.eta ? new Date(createOrderDto.eta) : null,
        shipperName: createOrderDto.shipperName,
        shipperAddress: createOrderDto.shipperAddress,
        shipperContact: createOrderDto.shipperContact,
        shipperPhone: createOrderDto.shipperPhone,
        consigneeName: createOrderDto.consigneeName,
        consigneeAddress: createOrderDto.consigneeAddress,
        consigneeContact: createOrderDto.consigneeContact,
        consigneePhone: createOrderDto.consigneePhone,
        notifyName: createOrderDto.notifyName,
        notifyAddress: createOrderDto.notifyAddress,
        notifyContact: createOrderDto.notifyContact,
        notifyPhone: createOrderDto.notifyPhone,
        remark: createOrderDto.remark,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    return order;
  }

  /**
   * 获取订单列表
   */
  async findAll(companyId: string, query: QueryOrderDto) {
    const { page = 1, pageSize = 20, status, type, keyword } = query;

    const where: any = { companyId };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { originPort: { contains: keyword } },
        { destinationPort: { contains: keyword } },
        { cargoDesc: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              companyName: true,
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
          shipments: {
            select: {
              id: true,
              containerNo: true,
              status: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
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
   * 获取订单详情
   */
  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            contactPhone: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
        shipments: {
          include: {
            nodes: {
              orderBy: { eventTime: 'desc' },
              take: 5,
            },
          },
        },
        bills: {
          select: {
            id: true,
            billNo: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }

  /**
   * 更新订单
   */
  async update(id: string, companyId: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 已完成的订单不能修改
    if (order.status === OrderStatus.COMPLETED) {
      throw new ForbiddenException('已完成的订单不能修改');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...updateOrderDto,
        status: updateOrderDto.status as OrderStatus,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * 取消订单
   */
  async cancel(id: string, companyId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 只能取消待确认或已确认的订单
    const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    if (!cancellableStatuses.includes(order.status as typeof cancellableStatuses[number])) {
      throw new ForbiddenException('当前状态不能取消订单');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });

    return updated;
  }

  /**
   * 获取所有订单（管理后台用）
   */
  async findAllAdmin(query: QueryOrderDto) {
    const { page = 1, pageSize = 20, status, type, keyword } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { originPort: { contains: keyword } },
        { destinationPort: { contains: keyword } },
        { cargoDesc: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              companyName: true,
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
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
   * 更新订单状态（管理后台用）
   */
  async updateStatusAdmin(id: string, status: OrderStatus, remark?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        internalRemark: remark,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    return updated;
  }
}
