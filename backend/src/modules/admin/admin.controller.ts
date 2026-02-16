import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from '../order/order.service';
import { BillingService } from '../billing/billing.service';
import { CustomerService } from '../customer/customer.service';
import { PrismaClient, OrderStatus, CompanyStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly orderService: OrderService,
    private readonly billingService: BillingService,
    private readonly customerService: CustomerService,
    private readonly prisma: PrismaClient,
  ) {}

  // ========== 仪表盘 ==========
  @Get('dashboard')
  async getDashboard() {
    const [
      totalCompanies,
      totalOrders,
      totalShipments,
      totalBills,
      pendingOrders,
      pendingBills,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.order.count(),
      this.prisma.shipment.count(),
      this.prisma.bill.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.bill.count({ where: { status: { in: ['ISSUED', 'PARTIAL_PAID'] } } }),
    ]);

    // 本月统计
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthOrders, monthBills] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.bill.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    return {
      overview: {
        totalCompanies,
        totalOrders,
        totalShipments,
        totalBills,
        pendingOrders,
        pendingBills,
      },
      monthly: {
        orders: monthOrders,
        revenue: monthBills._sum.amount || 0,
      },
    };
  }

  // ========== 客户管理 ==========
  @Get('companies')
  async getCompanies(@Query() query: any) {
    const { page = 1, pageSize = 20, status, keyword } = query;

    const where: any = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { companyName: { contains: keyword } },
        { creditCode: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: true,
              bills: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
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

  @Put('companies/:id/status')
  async updateCompanyStatus(@Param('id') id: string, @Body('status') status: CompanyStatus) {
    return this.prisma.company.update({
      where: { id },
      data: { status },
    });
  }

  // ========== 订单管理 ==========
  @Get('orders')
  async getAllOrders(@Query() query: any) {
    return this.orderService.findAllAdmin(query);
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('remark') remark?: string,
  ) {
    return this.orderService.updateStatusAdmin(id, status, remark);
  }

  // ========== 财务管理 ==========
  @Get('bills')
  async getAllBills(@Query() query: any) {
    return this.billingService.findAllAdmin(query);
  }

  @Put('bills/:id/payment')
  async confirmBillPayment(
    @Param('id') id: string,
    @Body('paidAmount') paidAmount: number,
    @Body('remark') remark?: string,
  ) {
    return this.billingService.confirmPayment(id, paidAmount, remark);
  }
}
