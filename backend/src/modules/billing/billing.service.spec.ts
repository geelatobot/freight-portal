import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaClient, BillStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { PrismaMockFactory } from '../../../test/utils/prisma-mock.factory';
import { TestDataFactory } from '../../../test/utils/test-data.factory';
import { CodeGeneratorService } from '../../common/services/code-generator.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: ReturnType<typeof PrismaMockFactory.createPrismaMock>;
  let mockBill: any;

  const mockCodeGenerator = {
    generateBillNo: jest.fn(() => 'BILL202401010001'),
  };

  beforeEach(async () => {
    prisma = PrismaMockFactory.createPrismaMock();
    mockBill = TestDataFactory.bill().build();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaClient,
          useValue: prisma,
        },
        {
          provide: CodeGeneratorService,
          useValue: mockCodeGenerator,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBillNo', () => {
    it('should generate valid bill number format', async () => {
      prisma.bill.create.mockImplementation((args: any): any => {
        const billNo = args.data.billNo;
        return Promise.resolve({ ...mockBill, billNo } as any);
      });

      const result = await service.createBill({
        companyId: 'company-1',
        orderId: 'order-1',
        billType: 'FREIGHT',
        amount: '1000',
        currency: 'CNY',
        items: [],
      } as any);

      expect(result.billNo).toMatch(/^BILL\d{12}$/);
    });

    it('should generate unique bill numbers', async () => {
      const billNumbers = new Set();
      let counter = 1;
      
      mockCodeGenerator.generateBillNo.mockImplementation(() => {
        const billNo = `BILL20240101${String(counter++).padStart(4, '0')}`;
        return billNo;
      });
      
      prisma.bill.create.mockImplementation((args: any): any => {
        const billNo = args.data.billNo;
        billNumbers.add(billNo);
        return Promise.resolve({ ...mockBill, billNo } as any);
      });

      // Create multiple bills
      for (let i = 0; i < 10; i++) {
        await service.createBill({
          companyId: 'company-1',
          orderId: 'order-1',
          billType: 'FREIGHT',
          amount: '1000',
          currency: 'CNY',
          items: [],
        } as any);
      }

      expect(billNumbers.size).toBe(10);
    });
  });

  describe('createBill', () => {
    const createBillDto = {
      companyId: 'company-1',
      orderId: 'order-1',
      billType: 'FREIGHT',
      amount: '15800',
      currency: 'CNY',
      items: [
        { itemCode: 'OCEAN', itemName: '海运费', quantity: 1, unit: 'UNIT', unitPrice: '10000', amount: '10000' },
        { itemCode: 'THC', itemName: '码头操作费', quantity: 1, unit: 'UNIT', unitPrice: '3000', amount: '3000' },
        { itemCode: 'DOC', itemName: '文件费', quantity: 1, unit: 'UNIT', unitPrice: '500', amount: '500' },
      ],
      remark: 'Freight charges for order ORD202401010001',
    };

    it('should create a new bill with items', async () => {
      prisma.bill.create.mockResolvedValue(mockBill as any);

      const result = await service.createBill(createBillDto as any);

      expect(result).toBeDefined();
      expect(prisma.bill.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          billNo: expect.stringMatching(/^BILL\d{12}$/),
          companyId: 'company-1',
          orderId: 'order-1',
          billType: 'FREIGHT',
          amount: 15800,
          currency: 'CNY',
          status: BillStatus.ISSUED,
          issueDate: expect.any(Date),
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                itemCode: 'OCEAN',
                itemName: '海运费',
                quantity: 1,
                unit: 'UNIT',
                unitPrice: 10000,
                amount: 10000,
                currency: 'CNY',
              }),
            ]),
          },
          remark: 'Freight charges for order ORD202401010001',
        }),
        include: expect.any(Object),
      });
    });

    it('should parse string amount to number', async () => {
      prisma.bill.create.mockResolvedValue(mockBill as any);

      await service.createBill(createBillDto as any);

      expect(prisma.bill.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 15800,
          }),
        })
      );
    });

    it('should parse item amounts to numbers', async () => {
      prisma.bill.create.mockResolvedValue(mockBill as any);

      await service.createBill(createBillDto as any);

      expect(prisma.bill.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  unitPrice: 10000,
                  amount: 10000,
                }),
              ]),
            },
          }),
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated bills for company', async () => {
      const mockBills = [
        TestDataFactory.bill().withId('bill-1').build(),
        TestDataFactory.bill().withId('bill-2').withBillNo('BILL202401010002').build(),
      ];

      prisma.bill.findMany.mockResolvedValue(mockBills as any);
      prisma.bill.count.mockResolvedValue(2);

      const result = await service.findAll('company-1', { page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      prisma.bill.findMany.mockResolvedValue([mockBill] as any);
      prisma.bill.count.mockResolvedValue(1);

      await service.findAll('company-1', { page: 1, pageSize: 20, status: BillStatus.ISSUED });

      expect(prisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            status: BillStatus.ISSUED,
          }),
        })
      );
    });

    it('should search by keyword', async () => {
      prisma.bill.findMany.mockResolvedValue([mockBill] as any);
      prisma.bill.count.mockResolvedValue(1);

      await service.findAll('company-1', { page: 1, pageSize: 20, keyword: 'BILL' });

      expect(prisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            OR: [
              { billNo: { contains: 'BILL' } },
              { order: { orderNo: { contains: 'BILL' } } },
            ],
          }),
        })
      );
    });

    it('should include related data', async () => {
      prisma.bill.findMany.mockResolvedValue([mockBill] as any);
      prisma.bill.count.mockResolvedValue(1);

      await service.findAll('company-1', { page: 1, pageSize: 20 });

      expect(prisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            company: expect.any(Object),
            order: expect.any(Object),
            items: expect.any(Object),
            invoice: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return bill by id with company filter', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill as any);

      const result = await service.findOne('bill-1', 'company-1');

      expect(result).toBeDefined();
      expect(prisma.bill.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bill-1', companyId: 'company-1' },
        })
      );
    });

    it('should return bill without company filter for admin', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill as any);

      const result = await service.findOne('bill-1');

      expect(result).toBeDefined();
      expect(prisma.bill.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bill-1' },
        })
      );
    });

    it('should throw NotFoundException when bill not found', async () => {
      prisma.bill.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'company-1')).rejects.toThrow(NotFoundException);
    });

    it('should include detailed company info', async () => {
      prisma.bill.findFirst.mockResolvedValue(mockBill as any);

      const result = await service.findOne('bill-1');

      expect(prisma.bill.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            company: {
              select: expect.objectContaining({
                id: true,
                companyName: true,
                creditCode: true,
                address: true,
                contactName: true,
                contactPhone: true,
              }),
            },
          }),
        })
      );
    });
  });

  describe('confirmPayment', () => {
    it('should update bill to PAID when fully paid', async () => {
      const bill = TestDataFactory.bill()
        .withAmount(1000)
        .withPaidAmount(0)
        .withStatus(BillStatus.ISSUED)
        .build();
      
      prisma.bill.findUnique.mockResolvedValue(bill as any);
      prisma.bill.update.mockResolvedValue({ ...bill, paidAmount: 1000, status: BillStatus.PAID } as any);

      const result = await service.confirmPayment('bill-1', 1000);

      expect(result.status).toBe(BillStatus.PAID);
      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: expect.objectContaining({
          paidAmount: 1000,
          status: BillStatus.PAID,
          paidDate: expect.any(Date),
        }),
      });
    });

    it('should update bill to PARTIAL_PAID when partially paid', async () => {
      const bill = TestDataFactory.bill()
        .withAmount(1000)
        .withPaidAmount(0)
        .withStatus(BillStatus.ISSUED)
        .build();
      
      prisma.bill.findUnique.mockResolvedValue(bill as any);
      prisma.bill.update.mockResolvedValue({ ...bill, paidAmount: 500, status: BillStatus.PARTIAL_PAID } as any);

      const result = await service.confirmPayment('bill-1', 500);

      expect(result.status).toBe(BillStatus.PARTIAL_PAID);
      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: expect.objectContaining({
          paidAmount: 500,
          status: BillStatus.PARTIAL_PAID,
          paidDate: expect.any(Date),
        }),
      });
    });

    it('should accumulate paid amount for multiple payments', async () => {
      const bill = TestDataFactory.bill()
        .withAmount(1000)
        .withPaidAmount(300)
        .withStatus(BillStatus.PARTIAL_PAID)
        .build();
      
      prisma.bill.findUnique.mockResolvedValue(bill as any);
      prisma.bill.update.mockResolvedValue({ ...bill, paidAmount: 800, status: BillStatus.PARTIAL_PAID } as any);

      const result = await service.confirmPayment('bill-1', 500);

      expect(result.status).toBe(BillStatus.PARTIAL_PAID);
      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: expect.objectContaining({
          paidAmount: 800,
        }),
      });
    });

    it('should transition from PARTIAL_PAID to PAID', async () => {
      const bill = TestDataFactory.bill()
        .withAmount(1000)
        .withPaidAmount(500)
        .withStatus(BillStatus.PARTIAL_PAID)
        .build();
      
      prisma.bill.findUnique.mockResolvedValue(bill as any);
      prisma.bill.update.mockResolvedValue({ ...bill, paidAmount: 1000, status: BillStatus.PAID } as any);

      const result = await service.confirmPayment('bill-1', 500);

      expect(result.status).toBe(BillStatus.PAID);
    });

    it('should throw NotFoundException when bill not found', async () => {
      prisma.bill.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment('nonexistent', 1000)).rejects.toThrow(NotFoundException);
    });

    it('should append remark to existing remark', async () => {
      const bill = TestDataFactory.bill()
        .withAmount(1000)
        .withPaidAmount(0)
        .withRemark('Original remark')
        .build();
      
      prisma.bill.findUnique.mockResolvedValue(bill as any);
      prisma.bill.update.mockResolvedValue({ ...bill, paidAmount: 1000 } as any);

      await service.confirmPayment('bill-1', 1000, 'Payment received');

      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: expect.objectContaining({
          remark: 'Original remark\nPayment received',
        }),
      });
    });

    it('should handle payment without remark', async () => {
      const bill = TestDataFactory.bill()
        .withAmount(1000)
        .withPaidAmount(0)
        .withRemark('Original remark')
        .build();
      
      prisma.bill.findUnique.mockResolvedValue(bill as any);
      prisma.bill.update.mockResolvedValue({ ...bill, paidAmount: 1000 } as any);

      await service.confirmPayment('bill-1', 1000);

      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: expect.objectContaining({
          remark: 'Original remark',
        }),
      });
    });

    it('should handle null remark', async () => {
      const bill = TestDataFactory.bill()
        .withAmount(1000)
        .withPaidAmount(0)
        .withRemark(null)
        .build();
      
      prisma.bill.findUnique.mockResolvedValue(bill as any);
      prisma.bill.update.mockResolvedValue({ ...bill, paidAmount: 1000 } as any);

      await service.confirmPayment('bill-1', 1000, 'Payment received');

      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: expect.objectContaining({
          remark: '\nPayment received',
        }),
      });
    });
  });

  describe('getStats', () => {
    it('should return billing statistics', async () => {
      prisma.bill.count
        .mockResolvedValueOnce(10)  // totalBills
        .mockResolvedValueOnce(0);  // overdueBills
      prisma.bill.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100000 } } as any)
        .mockResolvedValueOnce({ _sum: { paidAmount: 80000 } } as any)
        .mockResolvedValueOnce({ _sum: { amount: 20000 } } as any);

      const result = await service.getStats('company-1');

      expect(result).toEqual({
        totalBills: 10,
        totalAmount: 100000,
        paidAmount: 80000,
        unpaidAmount: 20000,
        overdueBills: 0,
      });
    });

    it('should handle zero values', async () => {
      prisma.bill.count.mockResolvedValue(0);
      prisma.bill.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } } as any)
        .mockResolvedValueOnce({ _sum: { paidAmount: null } } as any)
        .mockResolvedValueOnce({ _sum: { amount: null } } as any);

      const result = await service.getStats('company-1');

      expect(result).toEqual({
        totalBills: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        overdueBills: 0,
      });
    });

    it('should calculate unpaid amount correctly', async () => {
      prisma.bill.count.mockResolvedValue(5);
      prisma.bill.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } } as any)
        .mockResolvedValueOnce({ _sum: { paidAmount: 30000 } } as any)
        .mockResolvedValueOnce({ _sum: { amount: 20000 } } as any);

      const result = await service.getStats('company-1');

      expect(result.unpaidAmount).toBe(20000);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all bills for admin without company filter', async () => {
      const mockBills = [
        TestDataFactory.bill().withId('bill-1').build(),
        TestDataFactory.bill().withId('bill-2').withCompanyId('company-2').build(),
      ];

      prisma.bill.findMany.mockResolvedValue(mockBills as any);
      prisma.bill.count.mockResolvedValue(2);

      const result = await service.findAllAdmin({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(prisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}, // No company filter
        })
      );
    });

    it('should search by keyword including company name', async () => {
      prisma.bill.findMany.mockResolvedValue([mockBill] as any);
      prisma.bill.count.mockResolvedValue(1);

      await service.findAllAdmin({ page: 1, pageSize: 20, keyword: 'Test' });

      expect(prisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { billNo: { contains: 'Test' } },
              { order: { orderNo: { contains: 'Test' } } },
              { company: { companyName: { contains: 'Test' } } },
            ],
          }),
        })
      );
    });
  });
});
