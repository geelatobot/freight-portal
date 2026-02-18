import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { WinstonLoggerService } from '../../common/logger/winston-logger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceApplicationStatus, InvoiceType, InvoiceTitleType } from '@prisma/client';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: any;

  const mockPrisma = {
    bill: {
      findFirst: jest.fn(),
    },
    invoiceApplication: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockCodeGenerator = {
    generateInvoiceApplicationNo: jest.fn().mockReturnValue('INVA202502180001'),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: 'PrismaClient', useValue: mockPrisma },
        { provide: CodeGeneratorService, useValue: mockCodeGenerator },
        { provide: WinstonLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prisma = mockPrisma;

    jest.clearAllMocks();
  });

  describe('createApplication', () => {
    const mockBill = {
      id: 'bill-1',
      amount: 1000,
      status: 'ISSUED',
    };

    const createDto = {
      billId: 'bill-1',
      invoiceType: InvoiceType.VAT_NORMAL,
      titleType: InvoiceTitleType.ENTERPRISE,
      titleName: '测试公司',
      taxNumber: '91110000123456789X',
    };

    it('应该成功创建发票申请', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill);
      prisma.invoiceApplication.findFirst.mockResolvedValue(null);
      prisma.invoiceApplication.create.mockResolvedValue({
        id: 'app-1',
        applicationNo: 'INVA202502180001',
        ...createDto,
        amount: 1000,
        taxAmount: 60,
        totalAmount: 1060,
        status: InvoiceApplicationStatus.PENDING,
      });

      const result = await service.createApplication('company-1', 'user-1', createDto);

      expect(result.applicationNo).toBe('INVA202502180001');
      expect(result.amount).toBe(1000);
      expect(result.taxAmount).toBe(60);
      expect(result.totalAmount).toBe(1060);
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('账单不存在时应该抛出 NotFoundException', async () => {
      prisma.bill.findFirst.mockResolvedValue(null);

      await expect(
        service.createApplication('company-1', 'user-1', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('已存在有效申请时应该抛出 BadRequestException', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill);
      prisma.invoiceApplication.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createApplication('company-1', 'user-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findApplications', () => {
    it('应该返回分页的申请列表', async () => {
      const mockApplications = [
        { id: 'app-1', applicationNo: 'INVA001' },
        { id: 'app-2', applicationNo: 'INVA002' },
      ];

      prisma.invoiceApplication.findMany.mockResolvedValue(mockApplications);
      prisma.invoiceApplication.count.mockResolvedValue(2);

      const result = await service.findApplications('company-1', { page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('应该支持状态筛选', async () => {
      prisma.invoiceApplication.findMany.mockResolvedValue([]);
      prisma.invoiceApplication.count.mockResolvedValue(0);

      await service.findApplications('company-1', {
        status: InvoiceApplicationStatus.PENDING,
      });

      expect(prisma.invoiceApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            status: InvoiceApplicationStatus.PENDING,
          }),
        }),
      );
    });
  });

  describe('reviewApplication', () => {
    const mockApplication = {
      id: 'app-1',
      applicationNo: 'INVA001',
      status: InvoiceApplicationStatus.PENDING,
    };

    it('应该成功审核通过申请', async () => {
      prisma.invoiceApplication.findUnique.mockResolvedValue(mockApplication);
      prisma.invoiceApplication.update.mockResolvedValue({
        ...mockApplication,
        status: InvoiceApplicationStatus.APPROVED,
        reviewedBy: 'admin-1',
      });

      const result = await service.reviewApplication('app-1', 'admin-1', {
        status: InvoiceApplicationStatus.APPROVED,
        remark: '审核通过',
      });

      expect(result.status).toBe(InvoiceApplicationStatus.APPROVED);
      expect(result.reviewedBy).toBe('admin-1');
    });

    it('申请不存在时应该抛出 NotFoundException', async () => {
      prisma.invoiceApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewApplication('app-1', 'admin-1', {
          status: InvoiceApplicationStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('非待审核状态应该抛出 BadRequestException', async () => {
      prisma.invoiceApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: InvoiceApplicationStatus.APPROVED,
      });

      await expect(
        service.reviewApplication('app-1', 'admin-1', {
          status: InvoiceApplicationStatus.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('issueInvoice', () => {
    const mockApplication = {
      id: 'app-1',
      billId: 'bill-1',
      companyId: 'company-1',
      invoiceType: InvoiceType.VAT_NORMAL,
      amount: 1000,
      taxAmount: 60,
      totalAmount: 1060,
      status: InvoiceApplicationStatus.APPROVED,
    };

    it('应该成功开具发票', async () => {
      prisma.invoiceApplication.findUnique.mockResolvedValue(mockApplication);
      prisma.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNo: 'INV202502180001',
        status: 'ISSUED',
      });
      prisma.invoiceApplication.update.mockResolvedValue({
        ...mockApplication,
        status: InvoiceApplicationStatus.INVOICED,
      });

      const result = await service.issueInvoice('app-1', 'INV202502180001', '/downloads/inv1.pdf');

      expect(result.invoiceNo).toBe('INV202502180001');
      expect(result.status).toBe('ISSUED');
    });

    it('未通过审核的申请不能开具发票', async () => {
      prisma.invoiceApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: InvoiceApplicationStatus.PENDING,
      });

      await expect(
        service.issueInvoice('app-1', 'INV001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelApplication', () => {
    it('应该成功取消待审核的申请', async () => {
      prisma.invoiceApplication.findFirst.mockResolvedValue({
        id: 'app-1',
        status: InvoiceApplicationStatus.PENDING,
      });
      prisma.invoiceApplication.update.mockResolvedValue({
        id: 'app-1',
        status: InvoiceApplicationStatus.CANCELLED,
      });

      const result = await service.cancelApplication('app-1', 'company-1');

      expect(result.status).toBe(InvoiceApplicationStatus.CANCELLED);
    });

    it('已开具发票的申请不能取消', async () => {
      prisma.invoiceApplication.findFirst.mockResolvedValue({
        id: 'app-1',
        status: InvoiceApplicationStatus.INVOICED,
      });

      await expect(
        service.cancelApplication('app-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计数据', async () => {
      prisma.invoiceApplication.count.mockResolvedValue(10);
      prisma.invoiceApplication.aggregate.mockResolvedValue({
        _sum: { totalAmount: 50000 },
      });

      const result = await service.getStats('company-1');

      expect(result.totalApplications).toBe(10);
      expect(result.totalInvoicedAmount).toBe(50000);
    });
  });
});
