import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, BillStatus } from '@prisma/client';
import { QueryBillDto } from './dto/query-bill.dto';
import { CreateBillDto } from './dto/create-bill.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 生成账单号
   */
  private generateBillNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BILL${year}${month}${day}${random}`;
  }

  /**
   * 创建账单
   */
  async createBill(createBillDto: CreateBillDto) {
    const billNo = this.generateBillNo();

    const bill = await this.prisma.bill.create({
      data: {
        billNo,
        companyId: createBillDto.companyId,
        orderId: createBillDto.orderId,
        billType: createBillDto.billType as any,
        amount: parseFloat(createBillDto.amount),
        currency: createBillDto.currency,
        status: BillStatus.ISSUED,
        issueDate: new Date(),
        items: {
          create: createBillDto.items.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: parseFloat(item.unitPrice),
            amount: parseFloat(item.amount),
            currency: createBillDto.currency,
          })),
        },
        remark: createBillDto.remark,
      },
      include: {
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
          },
        },
        items: true,
      },
    });

    return bill;
  }

  /**
   * 获取账单列表
   */
  async findAll(companyId: string, query: QueryBillDto) {
    const { page = 1, pageSize = 20, status, keyword } = query;

    const where: any = { companyId };

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { billNo: { contains: keyword } },
        { order: { orderNo: { contains: keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
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
            },
          },
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              amount: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNo: true,
              status: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bill.count({ where }),
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
   * 获取账单详情
   */
  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const bill = await this.prisma.bill.findFirst({
      where,
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            creditCode: true,
            address: true,
            contactName: true,
            contactPhone: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            type: true,
            originPort: true,
            destinationPort: true,
          },
        },
        items: true,
        invoice: true,
      },
    });

    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    return bill;
  }

  /**
   * 确认收款
   */
  async confirmPayment(id: string, paidAmount: number, remark?: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    const newPaidAmount = (bill.paidAmount || 0) + paidAmount;
    let status = BillStatus.PARTIAL_PAID;

    if (newPaidAmount >= bill.amount) {
      status = BillStatus.PAID;
    }

    const updated = await this.prisma.bill.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status,
        paidDate: new Date(),
        remark: remark ? `${bill.remark || ''}\n${remark}` : bill.remark,
      },
    });

    return updated;
  }

  /**
   * 获取财务统计
   */
  async getStats(companyId: string) {
    const [
      totalBills,
      totalAmount,
      paidAmount,
      unpaidAmount,
      overdueBills,
    ] = await Promise.all([
      this.prisma.bill.count({ where: { companyId } }),
      this.prisma.bill.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      this.prisma.bill.aggregate({
        where: { companyId },
        _sum: { paidAmount: true },
      }),
      this.prisma.bill.aggregate({
        where: { companyId, status: { in: [BillStatus.ISSUED, BillStatus.PARTIAL_PAID] } },
        _sum: { amount: true },
      }),
      this.prisma.bill.count({
        where: {
          companyId,
          status: { in: [BillStatus.ISSUED, BillStatus.PARTIAL_PAID] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      totalBills,
      totalAmount: totalAmount._sum.amount || 0,
      paidAmount: paidAmount._sum.paidAmount || 0,
      unpaidAmount: (totalAmount._sum.amount || 0) - (paidAmount._sum.paidAmount || 0),
      overdueBills,
    };
  }

  /**
   * 获取所有账单（管理后台）
   */
  async findAllAdmin(query: QueryBillDto) {
    const { page = 1, pageSize = 20, status, keyword } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { billNo: { contains: keyword } },
        { order: { orderNo: { contains: keyword } } },
        { company: { companyName: { contains: keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
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
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bill.count({ where }),
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
}
