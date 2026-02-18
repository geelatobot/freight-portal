import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, InvoiceApplicationStatus, InvoiceType, InvoiceTitleType } from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { PaginationUtil } from '../../common/utils/pagination.util';
import { WinstonLoggerService } from '../../common/logger/winston-logger.service';

export interface CreateInvoiceApplicationDto {
  billId: string;
  invoiceType: InvoiceType;
  titleType: InvoiceTitleType;
  titleName: string;
  taxNumber?: string;
  companyAddress?: string;
  companyPhone?: string;
  bankName?: string;
  bankAccount?: string;
  remark?: string;
}

export interface QueryInvoiceApplicationDto {
  page?: number;
  pageSize?: number;
  status?: InvoiceApplicationStatus;
  keyword?: string;
}

export interface ReviewInvoiceApplicationDto {
  status: 'APPROVED' | 'REJECTED';
  remark?: string;
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * 申请发票
   */
  async createApplication(
    companyId: string,
    applicantId: string,
    dto: CreateInvoiceApplicationDto,
  ) {
    // 检查账单是否存在且属于该公司
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: dto.billId,
        companyId,
        status: { in: ['ISSUED', 'PARTIAL_PAID', 'PAID'] },
      },
    });

    if (!bill) {
      throw new NotFoundException('账单不存在或状态不允许申请发票');
    }

    // 检查是否已存在申请
    const existingApp = await this.prisma.invoiceApplication.findFirst({
      where: {
        billId: dto.billId,
        status: { in: ['PENDING', 'APPROVED', 'INVOICED'] },
      },
    });

    if (existingApp) {
      throw new BadRequestException('该账单已存在有效的发票申请');
    }

    // 计算税额（假设税率 6%）
    const amount = Number(bill.amount);
    const taxRate = 0.06;
    const taxAmount = Number((amount * taxRate).toFixed(2));
    const totalAmount = Number((amount + taxAmount).toFixed(2));

    const applicationNo = this.codeGenerator.generateInvoiceApplicationNo();

    const application = await this.prisma.invoiceApplication.create({
      data: {
        applicationNo,
        companyId,
        billId: dto.billId,
        applicantId,
        invoiceType: dto.invoiceType,
        titleType: dto.titleType,
        titleName: dto.titleName,
        taxNumber: dto.taxNumber,
        companyAddress: dto.companyAddress,
        companyPhone: dto.companyPhone,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        amount,
        taxAmount,
        totalAmount,
        status: InvoiceApplicationStatus.PENDING,
        remark: dto.remark,
      },
      include: {
        bill: {
          select: {
            billNo: true,
            amount: true,
          },
        },
      },
    });

    this.logger.log(`发票申请创建成功: ${applicationNo}`, 'InvoiceService');

    return application;
  }

  /**
   * 获取发票申请列表（客户端）
   */
  async findApplications(companyId: string, query: QueryInvoiceApplicationDto) {
    const { page = 1, pageSize = 20, status, keyword } = query;

    const where: any = { companyId };

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { applicationNo: { contains: keyword } },
        { titleName: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.invoiceApplication.findMany({
        where,
        include: {
          bill: {
            select: {
              billNo: true,
              amount: true,
            },
          },
        } as any,
        skip: PaginationUtil.calculateSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoiceApplication.count({ where }),
    ]);

    return PaginationUtil.createResult(list, total, page, pageSize);
  }

  /**
   * 获取发票申请详情
   */
  async findApplicationById(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const application = await this.prisma.invoiceApplication.findFirst({
      where,
      include: {
        bill: {
          select: {
            billNo: true,
            amount: true,
            order: {
              select: {
                orderNo: true,
              },
            },
          },
        },
      } as any,
    });

    if (!application) {
      throw new NotFoundException('发票申请不存在');
    }

    return application;
  }

  /**
   * 审核发票申请（管理端）
   */
  async reviewApplication(
    id: string,
    reviewerId: string,
    dto: ReviewInvoiceApplicationDto,
  ) {
    const application = await this.prisma.invoiceApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('发票申请不存在');
    }

    if (application.status !== InvoiceApplicationStatus.PENDING) {
      throw new BadRequestException('该申请已被处理');
    }

    const updated = await this.prisma.invoiceApplication.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewRemark: dto.remark,
      },
    });

    this.logger.log(
      `发票申请审核完成: ${application.applicationNo}, 状态: ${dto.status}`,
      'InvoiceService',
    );

    return updated;
  }

  /**
   * 开具发票（管理端）
   */
  async issueInvoice(id: string, invoiceNo: string, downloadUrl?: string) {
    const application = await this.prisma.invoiceApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('发票申请不存在');
    }

    if (application.status !== InvoiceApplicationStatus.APPROVED) {
      throw new BadRequestException('申请未通过审核，无法开具发票');
    }

    // 创建发票记录
    const invoice = await this.prisma.$transaction(async (tx) => {
      // 创建发票
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNo,
          billId: application.billId,
          companyId: application.companyId,
          invoiceType: application.invoiceType,
          amount: application.amount,
          taxAmount: application.taxAmount,
          totalAmount: application.totalAmount,
          status: 'ISSUED',
          issueDate: new Date(),
          downloadUrl,
        },
      });

      // 更新申请状态
      await tx.invoiceApplication.update({
        where: { id },
        data: {
          status: InvoiceApplicationStatus.INVOICED,
          invoiceId: newInvoice.id,
        },
      });

      return newInvoice;
    });

    this.logger.log(`发票开具成功: ${invoiceNo}`, 'InvoiceService');

    return invoice;
  }

  /**
   * 取消发票申请
   */
  async cancelApplication(id: string, companyId: string) {
    const application = await this.prisma.invoiceApplication.findFirst({
      where: { id, companyId },
    });

    if (!application) {
      throw new NotFoundException('发票申请不存在');
    }

    if (application.status === InvoiceApplicationStatus.INVOICED) {
      throw new BadRequestException('发票已开具，无法取消');
    }

    const updated = await this.prisma.invoiceApplication.update({
      where: { id },
      data: {
        status: InvoiceApplicationStatus.CANCELLED,
      },
    });

    return updated;
  }

  /**
   * 获取所有发票申请（管理端）
   */
  async findAllApplications(query: QueryInvoiceApplicationDto) {
    const { page = 1, pageSize = 20, status, keyword } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { applicationNo: { contains: keyword } },
        { titleName: { contains: keyword } },
        { company: { companyName: { contains: keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.invoiceApplication.findMany({
        where,
        include: {
          company: {
            select: {
              companyName: true,
              creditCode: true,
            },
          },
          bill: {
            select: {
              billNo: true,
            },
          },
        } as any,
        skip: PaginationUtil.calculateSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoiceApplication.count({ where }),
    ]);

    return PaginationUtil.createResult(list, total, page, pageSize);
  }

  /**
   * 获取发票统计
   */
  async getStats(companyId: string) {
    const [
      totalApplications,
      pendingCount,
      approvedCount,
      invoicedCount,
      totalAmount,
    ] = await Promise.all([
      this.prisma.invoiceApplication.count({ where: { companyId } }),
      this.prisma.invoiceApplication.count({
        where: { companyId, status: 'PENDING' },
      }),
      this.prisma.invoiceApplication.count({
        where: { companyId, status: 'APPROVED' },
      }),
      this.prisma.invoiceApplication.count({
        where: { companyId, status: 'INVOICED' },
      }),
      this.prisma.invoiceApplication.aggregate({
        where: { companyId, status: 'INVOICED' },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalApplications,
      pendingCount,
      approvedCount,
      invoicedCount,
      totalInvoicedAmount: totalAmount._sum.totalAmount || 0,
    };
  }
}
