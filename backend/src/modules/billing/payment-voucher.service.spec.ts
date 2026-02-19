import { Test, TestingModule } from '@nestjs/testing';
import { PaymentVoucherService } from './payment-voucher.service';
import { WinstonLoggerService } from '../../common/logger/winston-logger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VoucherStatus, PaymentMethod } from '@prisma/client';

describe('PaymentVoucherService', () => {
  let service: PaymentVoucherService;
  let prisma: any;

  const mockPrisma = {
    bill: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentVoucher: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentVoucherService,
        { provide: 'PrismaClient', useValue: mockPrisma },
        { provide: WinstonLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PaymentVoucherService>(PaymentVoucherService);
    prisma = mockPrisma;

    jest.clearAllMocks();
  });

  describe('createVoucher', () => {
    const mockBill = {
      id: 'bill-1',
      amount: 1000,
      paidAmount: 0,
      status: 'ISSUED',
    };

    const createDto = {
      billId: 'bill-1',
      amount: 500,
      paymentDate: new Date(),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      voucherNo: 'TX123456',
    };

    const fileInfo = {
      fileUrl: '/uploads/voucher.jpg',
      fileName: 'voucher.jpg',
      fileSize: 1024,
    };

    it('应该成功创建支付凭证', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill);
      prisma.paymentVoucher.findFirst.mockResolvedValue(null);
      prisma.paymentVoucher.create.mockResolvedValue({
        id: 'voucher-1',
        ...createDto,
        ...fileInfo,
        status: VoucherStatus.PENDING,
      });

      const result = await service.createVoucher('company-1', 'user-1', createDto, fileInfo);

      expect(result.status).toBe(VoucherStatus.PENDING);
      expect(result.amount).toBe(500);
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('支付金额超过未付金额时应该抛出 BadRequestException', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill);

      await expect(
        service.createVoucher('company-1', 'user-1', { ...createDto, amount: 1500 }, fileInfo),
      ).rejects.toThrow(BadRequestException);
    });

    it('已存在待审核凭证时应该抛出 BadRequestException', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill);
      prisma.paymentVoucher.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createVoucher('company-1', 'user-1', createDto, fileInfo),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyVoucher', () => {
    const mockVoucher = {
      id: 'voucher-1',
      billId: 'bill-1',
      amount: 500,
      status: VoucherStatus.PENDING,
      bill: {
        id: 'bill-1',
        amount: 1000,
        paidAmount: 0,
        status: 'ISSUED',
      },
    };

    it('审核通过应该更新账单支付状态', async () => {
      prisma.paymentVoucher.findUnique.mockResolvedValue(mockVoucher);
      prisma.paymentVoucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.VERIFIED,
      });

      const result = await service.verifyVoucher('voucher-1', 'admin-1', {
        status: VoucherStatus.VERIFIED,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('审核通过'),
        'PaymentVoucherService',
      );
    });

    it('审核拒绝应该只更新凭证状态', async () => {
      prisma.paymentVoucher.findUnique.mockResolvedValue(mockVoucher);
      prisma.paymentVoucher.update.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.REJECTED,
      });

      await service.verifyVoucher('voucher-1', 'admin-1', {
        status: VoucherStatus.REJECTED,
        remark: '凭证不清晰',
      });

      expect(prisma.paymentVoucher.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VoucherStatus.REJECTED,
            verifyRemark: '凭证不清晰',
          }),
        }),
      );
    });

    it('凭证不存在时应该抛出 NotFoundException', async () => {
      prisma.paymentVoucher.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyVoucher('voucher-1', 'admin-1', { status: VoucherStatus.VERIFIED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('非待审核状态应该抛出 BadRequestException', async () => {
      prisma.paymentVoucher.findUnique.mockResolvedValue({
        ...mockVoucher,
        status: VoucherStatus.VERIFIED,
      });

      await expect(
        service.verifyVoucher('voucher-1', 'admin-1', { status: VoucherStatus.VERIFIED }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteVoucher', () => {
    it('应该成功删除待审核的凭证', async () => {
      prisma.paymentVoucher.findFirst.mockResolvedValue({
        id: 'voucher-1',
        status: VoucherStatus.PENDING,
      });
      prisma.paymentVoucher.delete.mockResolvedValue({});

      const result = await service.deleteVoucher('voucher-1', 'company-1');

      expect(result.success).toBe(true);
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('已审核的凭证不能删除', async () => {
      prisma.paymentVoucher.findFirst.mockResolvedValue({
        id: 'voucher-1',
        status: VoucherStatus.VERIFIED,
      });

      await expect(
        service.deleteVoucher('voucher-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findVouchers', () => {
    it('应该返回分页的凭证列表', async () => {
      const mockVouchers = [
        { id: 'voucher-1', amount: 500 },
        { id: 'voucher-2', amount: 300 },
      ];

      prisma.paymentVoucher.findMany.mockResolvedValue(mockVouchers);
      prisma.paymentVoucher.count.mockResolvedValue(2);

      const result = await service.findVouchers('company-1', { page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });
});
