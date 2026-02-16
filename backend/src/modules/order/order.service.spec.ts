import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaClient, OrderStatus } from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaClient,
          useValue: {
            order: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const mockOrder = {
        id: '1',
        orderNo: 'ORD2024001001',
        companyId: '1',
        type: 'FCL',
        status: OrderStatus.PENDING,
        originPort: 'CNSHA',
        destinationPort: 'USLAX',
        cargoDesc: 'Test cargo',
      };

      jest.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder as any);

      const result = await service.create('user1', 'company1', {
        type: 'FCL',
        originPort: 'CNSHA',
        destinationPort: 'USLAX',
        cargoDesc: 'Test cargo',
      } as any);

      expect(result).toBeDefined();
      expect(result.orderNo).toMatch(/^ORD\d{10}$/);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        { id: '1', orderNo: 'ORD001', status: OrderStatus.PENDING },
        { id: '2', orderNo: 'ORD002', status: OrderStatus.CONFIRMED },
      ];

      jest.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(2);

      const result = await service.findAll('company1', { page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('cancel', () => {
    it('should cancel pending order', async () => {
      const mockOrder = {
        id: '1',
        status: OrderStatus.PENDING,
      };

      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED } as any);

      const result = await service.cancel('1', 'company1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw error for completed order', async () => {
      const mockOrder = {
        id: '1',
        status: OrderStatus.COMPLETED,
      };

      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(mockOrder as any);

      await expect(service.cancel('1', 'company1')).rejects.toThrow();
    });
  });
});
