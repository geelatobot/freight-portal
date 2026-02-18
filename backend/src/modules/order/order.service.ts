import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { CodeGeneratorService } from '../../common/utils/code-generator.service';
import { DateUtilService } from '../../common/utils/date-util.service';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly dateUtil: DateUtilService,
  ) {}

  /**
   * 创建订单
   */
  async create(userId: string, companyId: string, createOrderDto: CreateOrderDto) {
    const orderNo = this.codeGenerator.generateOrderNo();

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
        etd: this.dateUtil.parseDate(createOrderDto.etd),
        eta: this.dateUtil.parseDate(createOrderDto.eta),
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
        skip: PaginationUtil.calculateSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return PaginationUtil.createResult(list, total, page, pageSize);
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
   * 导出订单为CSV
   */
  async exportOrders(companyId: string, query: QueryOrderDto) {
    const { status, type, keyword } = query;

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

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        company: {
          select: {
            companyName: true,
          },
        },
        creator: {
          select: {
            username: true,
            realName: true,
          },
        },
        shipments: {
          select: {
            containerNo: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 生成CSV
    const headers = ['订单号', '类型', '状态', '起始港', '目的港', '货物描述', '货重(KG)', '货量(CBM)', '箱型', '箱量', 'ETD', 'ETA', '发货人', '收货人', '通知人', '创建人', '创建时间'];
    
    const rows = orders.map(order => [
      order.orderNo,
      order.type,
      order.status,
      order.originPortName,
      order.destinationPortName,
      order.cargoDesc || '',
      order.cargoWeight || '',
      order.cargoVolume || '',
      order.containerType || '',
      order.containerCount || '',
      order.etd ? new Date(order.etd).toISOString().split('T')[0] : '',
      order.eta ? new Date(order.eta).toISOString().split('T')[0] : '',
      order.shipperName || '',
      order.consigneeName || '',
      order.notifyName || '',
      order.creator?.realName || order.creator?.username || '',
      new Date(order.createdAt).toISOString().split('T')[0],
    ]);

    // 添加BOM以支持中文
    const bom = '\uFEFF';
    const csv = bom + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
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
        skip: PaginationUtil.calculateSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return PaginationUtil.createResult(list, total, page, pageSize);
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
