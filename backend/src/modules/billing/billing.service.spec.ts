import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaClient, BillStatus } from '@prisma/client';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaClient,
          useValue: {
            bill: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            billItem: {
              createMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBill', () => {
    it('should create a new bill with items', async () => {
      const mockBill = {
        id: '1',
        billNo: 'BILL2024001001',
        companyId: '1',
        amount: 15800,
        currency: 'CNY',
        status: BillStatus.ISSUED,
      };

      jest.spyOn(prisma.bill, 'create').mockResolvedValue(mockBill as any);

      const result = await service.createBill({
        companyId: '1',
        billType: 'FREIGHT',
        amount: '15800',
        currency: 'CNY',
        items: [
          { itemCode: 'OCEAN', itemName: '海运费', quantity: 1, unit: 'UNIT', unitPrice: '10000', amount: '10000' },
        ],
      } as any);

      expect(result).toBeDefined();
      expect(result.billNo).toMatch(/^BILL\d{10}$/);
    });
  });

  describe('confirmPayment', () => {
    it('should update bill to PAID when fully paid', async () => {
      const mockBill = {
        id: '1',
        amount: 1000,
        paidAmount: 0,
        status: BillStatus.ISSUED,
      };

      jest.spyOn(prisma.bill, 'findUnique').mockResolvedValue(mockBill as any);
      jest.spyOn(prisma.bill, 'update').mockResolvedValue({ ...mockBill, paidAmount: 1000, status: BillStatus.PAID } as any);

      const result = await service.confirmPayment('1', 1000);

      expect(result.status).toBe(BillStatus.PAID);
    });

    it('should update bill to PARTIAL_PAID when partially paid', async () => {
      const mockBill = {
        id: '1',
        amount: 1000,
        paidAmount: 0,
        status: BillStatus.ISSUED,
      };

      jest.spyOn(prisma.bill, 'findUnique').mockResolvedValue(mockBill as any);
      jest.spyOn(prisma.bill, 'update').mockResolvedValue({ ...mockBill, paidAmount: 500, status: BillStatus.PARTIAL_PAID } as any);

      const result = await service.confirmPayment('1', 500);

      expect(result.status).toBe(BillStatus.PARTIAL_PAID);
    });
  });

  describe('getStats', () => {
    it('should return billing statistics', async () => {
      jest.spyOn(prisma.bill, 'count').mockResolvedValue(10);
      jest.spyOn(prisma.bill, 'aggregate')
        .mockResolvedValueOnce({ _sum: { amount: 100000 } } as any)
        .mockResolvedValueOnce({ _sum: { paidAmount: 80000 } } as any)
        .mockResolvedValueOnce({ _sum: { amount: 20000 } } as any);

      const result = await service.getStats('company1');

      expect(result.totalBills).toBe(10);
      expect(result.totalAmount).toBe(100000);
      expect(result.paidAmount).toBe(80000);
    });
  });
});
