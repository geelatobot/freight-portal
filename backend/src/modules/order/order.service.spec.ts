import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CodeGeneratorService } from '../../common/utils/code-generator.service';
import { DateUtilService } from '../../common/utils/date-util.service';
import { TestModuleUtil } from '../../../test/test-module.util';
import { TestDataFactory } from '../../../test/test-data.factory';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: jest.Mocked<PrismaClient>;
  let codeGenerator: CodeGeneratorService;

  const mockOrder = TestDataFactory.createOrder();

  beforeEach(async () => {
    const { module, prisma: prismaMock } = await TestModuleUtil.createTestingModuleWithPrisma({
      providers: [
        OrderService,
        CodeGeneratorService,
        DateUtilService,
      ],
    });

    service = module.get<OrderService>(OrderService);
    prisma = prismaMock;
    codeGenerator = module.get<CodeGeneratorService>(CodeGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOrderDto = TestDataFactory.createCreateOrderDto();

    it('should create a new order with all fields', async () => {
      jest.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder as any);
      jest.spyOn(codeGenerator, 'generateOrderNo').mockReturnValue('ORD202401010001');

      const result = await service.create('user-1', 'company-1', createOrderDto as any);

      expect(result).toBeDefined();
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderNo: 'ORD202401010001',
          companyId: 'company-1',
          creatorId: 'user-1',
          type: 'FCL',
          status: OrderStatus.PENDING,
          originPort: 'CNSHA',
          originPortName: 'CNSHA',
          destinationPort: 'USLAX',
          destinationPortName: 'USLAX',
          cargoDesc: 'Electronics',
          cargoWeight: 5000,
          cargoVolume: 25,
          cargoPackageType: 'CTNS',
          cargoPackageCount: 500,
          containerType: '40HQ',
          containerCount: 2,
          etd: expect.any(Date),
          eta: expect.any(Date),
          shipperName: 'ABC Electronics',
          shipperAddress: '123 Main St, Shanghai',
          shipperContact: 'John Doe',
          shipperPhone: '13800138000',
          consigneeName: 'XYZ Import',
          consigneeAddress: '456 Oak Ave, Los Angeles',
          consigneeContact: 'Jane Smith',
          consigneePhone: '1234567890',
          notifyName: 'XYZ Notify',
          notifyAddress: '789 Pine Rd, Los Angeles',
          notifyContact: 'Bob Wilson',
          notifyPhone: '0987654321',
          remark: 'Handle with care',
        }),
        include: expect.any(Object),
      });
    });

    it('should create order without optional dates', async () => {
      const dtoWithoutDates = { ...createOrderDto };
      delete (dtoWithoutDates as any).etd;
      delete (dtoWithoutDates as any).eta;

      jest.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder as any);
      jest.spyOn(codeGenerator, 'generateOrderNo').mockReturnValue('ORD202401010001');

      await service.create('user-1', 'company-1', dtoWithoutDates as any);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            etd: null,
            eta: null,
          }),
        })
      );
    });

    it('should use CodeGeneratorService to generate order number', async () => {
      jest.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder as any);
      const generateSpy = jest.spyOn(codeGenerator, 'generateOrderNo').mockReturnValue('ORD202401010001');

      await service.create('user-1', 'company-1', createOrderDto as any);

      expect(generateSpy).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        TestDataFactory.createOrder({ id: 'order-1' }),
        TestDataFactory.createOrder({ id: 'order-2', orderNo: 'ORD202401010002' }),
      ];

      jest.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(2);

      const result = await service.findAll('company-1', { page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(1);

      await service.findAll('company-1', { page: 1, pageSize: 20, status: OrderStatus.PENDING });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            status: OrderStatus.PENDING,
          }),
        })
      );
    });

    it('should filter by type', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(1);

      await service.findAll('company-1', { page: 1, pageSize: 20, type: 'FCL' });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            type: 'FCL',
          }),
        })
      );
    });

    it('should search by keyword', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(1);

      await service.findAll('company-1', { page: 1, pageSize: 20, keyword: 'CNSHA' });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            OR: [
              { orderNo: { contains: 'CNSHA' } },
              { originPort: { contains: 'CNSHA' } },
              { destinationPort: { contains: 'CNSHA' } },
              { cargoDesc: { contains: 'CNSHA' } },
            ],
          }),
        })
      );
    });

    it('should use default pagination values', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(0);

      await service.findAll('company-1', {} as any);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return order by id with company filter', async () => {
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(mockOrder as any);

      const result = await service.findOne('order-1', 'company-1');

      expect(result).toBeDefined();
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1', companyId: 'company-1' },
        })
      );
    });

    it('should return order without company filter for admin', async () => {
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(mockOrder as any);

      const result = await service.findOne('order-1');

      expect(result).toBeDefined();
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
        })
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'company-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateOrderDto = {
      cargoDesc: 'Updated cargo',
      cargoWeight: 2000,
      remark: 'Updated remark',
    };

    it('should update order successfully', async () => {
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...mockOrder, ...updateOrderDto } as any);

      const result = await service.update('order-1', 'company-1', updateOrderDto as any);

      expect(result).toBeDefined();
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(null);

      await expect(service.update('nonexistent', 'company-1', updateOrderDto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order is completed', async () => {
      const completedOrder = TestDataFactory.createOrder({ status: OrderStatus.COMPLETED });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(completedOrder as any);

      await expect(service.update('order-1', 'company-1', updateOrderDto as any)).rejects.toThrow(ForbiddenException);
    });

    it('should allow update of pending order', async () => {
      const pendingOrder = TestDataFactory.createOrder({ status: OrderStatus.PENDING });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(pendingOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...pendingOrder, ...updateOrderDto } as any);

      const result = await service.update('order-1', 'company-1', updateOrderDto as any);

      expect(result).toBeDefined();
    });

    it('should allow update of confirmed order', async () => {
      const confirmedOrder = TestDataFactory.createOrder({ status: OrderStatus.CONFIRMED });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(confirmedOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...confirmedOrder, ...updateOrderDto } as any);

      const result = await service.update('order-1', 'company-1', updateOrderDto as any);

      expect(result).toBeDefined();
    });
  });

  describe('cancel', () => {
    it('should cancel pending order', async () => {
      const pendingOrder = TestDataFactory.createOrder({ status: OrderStatus.PENDING });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(pendingOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...pendingOrder, status: OrderStatus.CANCELLED } as any);

      const result = await service.cancel('order-1', 'company-1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    it('should cancel confirmed order', async () => {
      const confirmedOrder = TestDataFactory.createOrder({ status: OrderStatus.CONFIRMED });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(confirmedOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...confirmedOrder, status: OrderStatus.CANCELLED } as any);

      const result = await service.cancel('order-1', 'company-1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw NotFoundException when order not found', async () => {
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(null);

      await expect(service.cancel('nonexistent', 'company-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order is completed', async () => {
      const completedOrder = TestDataFactory.createOrder({ status: OrderStatus.COMPLETED });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(completedOrder as any);

      await expect(service.cancel('order-1', 'company-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when order is already cancelled', async () => {
      const cancelledOrder = TestDataFactory.createOrder({ status: OrderStatus.CANCELLED });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(cancelledOrder as any);

      await expect(service.cancel('order-1', 'company-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when order is in transit', async () => {
      const processingOrder = TestDataFactory.createOrder({ status: OrderStatus.PROCESSING });
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(processingOrder as any);

      await expect(service.cancel('order-1', 'company-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all orders for admin without company filter', async () => {
      const mockOrders = [
        TestDataFactory.createOrder({ id: 'order-1' }),
        TestDataFactory.createOrder({ id: 'order-2', companyId: 'company-2' }),
      ];

      jest.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(2);

      const result = await service.findAllAdmin({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}, // No company filter
        })
      );
    });

    it('should filter by status for admin', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as any);
      jest.spyOn(prisma.order, 'count').mockResolvedValue(1);

      await service.findAllAdmin({ page: 1, pageSize: 20, status: OrderStatus.PENDING });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrderStatus.PENDING },
        })
      );
    });
  });

  describe('updateStatusAdmin', () => {
    it('should update order status as admin', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...mockOrder, status: OrderStatus.CONFIRMED } as any);

      const result = await service.updateStatusAdmin('order-1', OrderStatus.CONFIRMED, 'Confirmed by admin');

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.CONFIRMED,
          internalRemark: 'Confirmed by admin',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);

      await expect(service.updateStatusAdmin('nonexistent', OrderStatus.CONFIRMED)).rejects.toThrow(NotFoundException);
    });

    it('should update status without remark', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...mockOrder, status: OrderStatus.PROCESSING } as any);

      const result = await service.updateStatusAdmin('order-1', OrderStatus.PROCESSING);

      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should handle status transition from PENDING to CONFIRMED', async () => {
      const pendingOrder = TestDataFactory.createOrder({ status: OrderStatus.PENDING });
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(pendingOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...pendingOrder, status: OrderStatus.CONFIRMED } as any);

      const result = await service.updateStatusAdmin('order-1', OrderStatus.CONFIRMED);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should handle status transition from CONFIRMED to PROCESSING', async () => {
      const confirmedOrder = TestDataFactory.createOrder({ status: OrderStatus.CONFIRMED });
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(confirmedOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...confirmedOrder, status: OrderStatus.PROCESSING } as any);

      const result = await service.updateStatusAdmin('order-1', OrderStatus.PROCESSING);

      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should handle status transition from PROCESSING to COMPLETED', async () => {
      const processingOrder = TestDataFactory.createOrder({ status: OrderStatus.PROCESSING });
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(processingOrder as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...processingOrder, status: OrderStatus.COMPLETED } as any);

      const result = await service.updateStatusAdmin('order-1', OrderStatus.COMPLETED);

      expect(result.status).toBe(OrderStatus.COMPLETED);
    });
  });
});
