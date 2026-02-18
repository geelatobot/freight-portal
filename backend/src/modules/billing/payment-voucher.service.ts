import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, VoucherStatus, PaymentMethod } from '@prisma/client';
import { WinstonLoggerService } from '../../common/logger/winston-logger.service';
import { PaginationUtil } from '../../common/utils/pagination.util';

export interface CreatePaymentVoucherDto {
  billId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  voucherNo?: string;
  remark?: string;
}

export interface UploadVoucherFileDto {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export interface VerifyVoucherDto {
  status: 'VERIFIED' | 'REJECTED';
  remark?: string;
}

export interface QueryVoucherDto {
  page?: number;
  pageSize?: number;
  status?: VoucherStatus;
  billId?: string;
}

@Injectable()
export class PaymentVoucherService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * 上传支付凭证
   */
  async createVoucher(
    companyId: string,
    uploaderId: string,
    dto: CreatePaymentVoucherDto,
    file: UploadVoucherFileDto,
  ) {
    // 检查账单是否存在且属于该公司
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: dto.billId,
        companyId,
        status: { in: ['ISSUED', 'PARTIAL_PAID'] },
      },
    });

    if (!bill) {
      throw new NotFoundException('账单不存在或状态不允许上传凭证');
    }

    // 验证金额不超过未付金额
    const unpaidAmount = Number(bill.amount) - Number(bill.paidAmount || 0);
    if (dto.amount > unpaidAmount) {
      throw new BadRequestException(`支付金额不能超过未付金额 ${unpaidAmount} 元`);
    }

    // 检查是否已存在待审核的凭证
    const existingVoucher = await this.prisma.paymentVoucher.findFirst({
      where: {
        billId: dto.billId,
        status: VoucherStatus.PENDING,
      },
    });

    if (existingVoucher) {
      throw new BadRequestException('该账单已存在待审核的支付凭证');
    }

    const voucher = await this.prisma.paymentVoucher.create({
      data: {
        billId: dto.billId,
        companyId,
        uploaderId,
        voucherNo: dto.voucherNo,
        amount: dto.amount,
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod,
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        status: VoucherStatus.PENDING,
        remark: dto.remark,
      },
      include: {
        bill: {
          select: {
            billNo: true,
            amount: true,
            paidAmount: true,
          },
        },
      },
    });

    this.logger.log(`支付凭证上传成功: ${voucher.id}`, 'PaymentVoucherService');

    return voucher;
  }

  /**
   * 获取支付凭证列表（客户端）
   */
  async findVouchers(companyId: string, query: QueryVoucherDto) {
    const { page = 1, pageSize = 20, status, billId } = query;

    const where: any = { companyId };

    if (status) {
      where.status = status;
    }

    if (billId) {
      where.billId = billId;
    }

    const [list, total] = await Promise.all([
      this.prisma.paymentVoucher.findMany({
        where,
        include: {
          bill: {
            select: {
              billNo: true,
              amount: true,
            },
          },
        },
        skip: PaginationUtil.calculateSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentVoucher.count({ where }),
    ]);

    return PaginationUtil.createResult(list, total, page, pageSize);
  }

  /**
   * 获取支付凭证详情
   */
  async findVoucherById(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const voucher = await this.prisma.paymentVoucher.findFirst({
      where,
      include: {
        bill: {
          select: {
            billNo: true,
            amount: true,
            paidAmount: true,
            status: true,
          },
        },
        uploader: {
          select: {
            id: true,
            realName: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException('支付凭证不存在');
    }

    return voucher;
  }

  /**
   * 审核支付凭证（管理端）
   */
  async verifyVoucher(
    id: string,
    verifierId: string,
    dto: VerifyVoucherDto,
  ) {
    const voucher = await this.prisma.paymentVoucher.findUnique({
      where: { id },
      include: {
        bill: true,
      },
    });

    if (!voucher) {
      throw new NotFoundException('支付凭证不存在');
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      throw new BadRequestException('该凭证已被处理');
    }

    // 如果审核通过，更新账单支付状态
    if (dto.status === VoucherStatus.VERIFIED) {
      await this.prisma.$transaction(async (tx) => {
        // 更新凭证状态
        await tx.paymentVoucher.update({
          where: { id },
          data: {
            status: VoucherStatus.VERIFIED,
            verifiedBy: verifierId,
            verifiedAt: new Date(),
            verifyRemark: dto.remark,
          },
        });

        // 更新账单支付金额和状态
        const bill = voucher.bill;
        const newPaidAmount = Number(bill.paidAmount || 0) + Number(voucher.amount);
        let billStatus = bill.status;

        if (newPaidAmount >= Number(bill.amount)) {
          billStatus = 'PAID' as any;
        } else if (newPaidAmount > 0) {
          billStatus = 'PARTIAL_PAID' as any;
        }

        await tx.bill.update({
          where: { id: bill.id },
          data: {
            paidAmount: newPaidAmount,
            status: billStatus,
            paidDate: newPaidAmount >= Number(bill.amount) ? new Date() : bill.paidDate,
          },
        });
      });

      this.logger.log(
        `支付凭证审核通过: ${voucher.id}, 金额: ${voucher.amount}`,
        'PaymentVoucherService',
      );
    } else {
      // 审核拒绝
      await this.prisma.paymentVoucher.update({
        where: { id },
        data: {
          status: VoucherStatus.REJECTED,
          verifiedBy: verifierId,
          verifiedAt: new Date(),
          verifyRemark: dto.remark,
        },
      });

      this.logger.log(
        `支付凭证审核拒绝: ${voucher.id}, 原因: ${dto.remark}`,
        'PaymentVoucherService',
      );
    }

    return this.findVoucherById(id);
  }

  /**
   * 获取所有支付凭证（管理端）
   */
  async findAllVouchers(query: QueryVoucherDto) {
    const { page = 1, pageSize = 20, status, billId } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (billId) {
      where.billId = billId;
    }

    const [list, total] = await Promise.all([
      this.prisma.paymentVoucher.findMany({
        where,
        include: {
          company: {
            select: {
              companyName: true,
            },
          },
          bill: {
            select: {
              billNo: true,
              amount: true,
            },
          },
          uploader: {
            select: {
              realName: true,
            },
          },
        },
        skip: PaginationUtil.calculateSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentVoucher.count({ where }),
    ]);

    return PaginationUtil.createResult(list, total, page, pageSize);
  }

  /**
   * 获取账单的支付凭证
   */
  async findVouchersByBillId(billId: string, companyId?: string) {
    const where: any = { billId };
    if (companyId) {
      where.companyId = companyId;
    }

    return this.prisma.paymentVoucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 删除支付凭证（仅待审核状态可删除）
   */
  async deleteVoucher(id: string, companyId: string) {
    const voucher = await this.prisma.paymentVoucher.findFirst({
      where: { id, companyId },
    });

    if (!voucher) {
      throw new NotFoundException('支付凭证不存在');
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      throw new BadRequestException('只有待审核的凭证可以删除');
    }

    await this.prisma.paymentVoucher.delete({
      where: { id },
    });

    this.logger.log(`支付凭证删除: ${id}`, 'PaymentVoucherService');

    return { success: true };
  }
}
