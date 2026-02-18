import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentService } from './shipment.service';
import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { SyncService } from '../sync/services/sync.service';
import { NotFoundException } from '@nestjs/common';

describe('ShipmentService', () => {
  let service: ShipmentService;
  let prisma: PrismaClient;
  let syncService: SyncService;

  const mockShipment = {
    id: 'shipment-1',
    shipmentNo: 'SH202401010001',
    containerNo: 'MSCU1234567',
    containerType: '20GP',
    companyId: 'company-1',
    blNo: 'BL123456789',
    bookingNo: 'BK987654321',
    carrierCode: 'MSC',
    carrierName: 'Mediterranean Shipping Company',
    originPort: 'CNSHA',
    originPortName: 'Shanghai',
    destinationPort: 'USLAX',
    destinationPortName: 'Los Angeles',
    etd: new Date('2024-02-01'),
    eta: new Date('2024-02-15'),
    atd: null,
    ata: null,
    status: ShipmentStatus.DEPARTURE,
    currentNode: 'DEPARTURE',
    syncSource: '4portun',
    lastSyncAt: new Date(),
    nodes: [
      {
        id: 'node-1',
        shipmentId: 'shipment-1',
        nodeCode: 'GATE_IN',
        nodeName: 'Gate In',
        location: 'Shanghai',
        eventTime: new Date('2024-01-30'),
        description: 'Container gated in',
        operator: 'Terminal',
        source: '4portun',
      },
      {
        id: 'node-2',
        shipmentId: 'shipment-1',
        nodeCode: 'DEPARTURE',
        nodeName: 'Departure',
        location: 'Shanghai',
        eventTime: new Date('2024-02-01'),
        description: 'Vessel departed',
        operator: 'MSC',
        source: '4portun',
      },
    ],
    company: {
      id: 'company-1',
      companyName: 'Test Company',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentService,
        {
          provide: PrismaClient,
          useValue: {
            shipment: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            shipmentNode: {
              upsert: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: SyncService,
          useValue: {
            syncContainer: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShipmentService>(ShipmentService);
    prisma = module.get<PrismaClient>(PrismaClient);
    syncService = module.get<SyncService>(SyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackContainer', () => {
    it('should return shipment from database if exists and data is fresh', async () => {
      const freshShipment = {
        ...mockShipment,
        lastSyncAt: new Date(), // Fresh data
      };

      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(freshShipment as any);

      const result = await service.trackContainer('MSCU1234567');

      expect(result).toBeDefined();
      expect(result.containerNo).toBe('MSCU1234567');
      expect(syncService.syncContainer).not.toHaveBeenCalled();
    });

    it('should sync from 4portun if shipment not in database', async () => {
      jest.spyOn(prisma.shipment, 'findUnique')
        .mockResolvedValueOnce(null)  // First call returns null
        .mockResolvedValueOnce(mockShipment as any);  // Second call returns shipment after sync
      
      jest.spyOn(syncService, 'syncContainer').mockResolvedValue({ id: 'shipment-1' } as any);

      const result = await service.trackContainer('MSCU1234567', 'company-1');

      expect(syncService.syncContainer).toHaveBeenCalledWith('MSCU1234567', 'company-1');
      expect(result).toBeDefined();
    });

    it('should sync from 4portun if data is stale', async () => {
      const staleShipment = {
        ...mockShipment,
        lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };

      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValueOnce(staleShipment as any);
      jest.spyOn(syncService, 'syncContainer').mockResolvedValue({ id: 'shipment-1' } as any);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValueOnce(mockShipment as any);

      const result = await service.trackContainer('MSCU1234567', 'company-1');

      expect(syncService.syncContainer).toHaveBeenCalledWith('MSCU1234567', 'company-1');
    });

    it('should return local data if sync fails but local data exists', async () => {
      const staleShipment = {
        ...mockShipment,
        lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      };

      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(staleShipment as any);
      jest.spyOn(syncService, 'syncContainer').mockRejectedValue(new Error('Sync failed'));

      const result = await service.trackContainer('MSCU1234567', 'company-1');

      expect(result).toBeDefined();
      expect(result.containerNo).toBe('MSCU1234567');
    });

    it('should throw NotFoundException if sync fails and no local data', async () => {
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(syncService, 'syncContainer').mockRejectedValue(new Error('Sync failed'));

      await expect(service.trackContainer('MSCU1234567', 'company-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if shipment not found anywhere', async () => {
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(syncService, 'syncContainer').mockResolvedValue(null);

      await expect(service.trackContainer('NONEXISTENT', 'company-1')).rejects.toThrow(NotFoundException);
    });

    it('should handle sync with companyId', async () => {
      jest.spyOn(prisma.shipment, 'findUnique')
        .mockResolvedValueOnce(null)  // First call returns null
        .mockResolvedValueOnce(mockShipment as any);  // Second call returns shipment after sync
      
      jest.spyOn(syncService, 'syncContainer').mockResolvedValue({ id: 'shipment-1', companyId: 'company-1' } as any);

      const result = await service.trackContainer('MSCU1234567', 'company-1');

      expect(syncService.syncContainer).toHaveBeenCalledWith('MSCU1234567', 'company-1');
      expect(result).toBeDefined();
    });
  });

  describe('trackByBlNo', () => {
    it('should return shipments by BL number', async () => {
      const mockShipments = [
        { ...mockShipment, id: 'shipment-1' },
        { ...mockShipment, id: 'shipment-2', containerNo: 'MSCU7654321' },
      ];

      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue(mockShipments as any);

      const result = await service.trackByBlNo('BL123456789');

      expect(result).toHaveLength(2);
      expect(prisma.shipment.findMany).toHaveBeenCalledWith({
        where: { blNo: 'BL123456789' },
        include: {
          nodes: {
            orderBy: { eventTime: 'desc' },
          },
          company: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });
    });

    it('should return empty array if no shipments found', async () => {
      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([]);

      const result = await service.trackByBlNo('NONEXISTENT');

      expect(result).toEqual([]);
    });
  });

  describe('getCompanyShipments', () => {
    it('should return paginated shipments for company', async () => {
      const mockShipments = [
        { ...mockShipment, id: 'shipment-1' },
        { ...mockShipment, id: 'shipment-2', containerNo: 'MSCU7654321' },
      ];

      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue(mockShipments as any);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(2);

      const result = await service.getCompanyShipments('company-1', { page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([mockShipment] as any);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(1);

      await service.getCompanyShipments('company-1', { page: 1, pageSize: 20, status: ShipmentStatus.DEPARTURE });

      expect(prisma.shipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            status: ShipmentStatus.DEPARTURE,
          }),
        })
      );
    });

    it('should search by keyword', async () => {
      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([mockShipment] as any);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(1);

      await service.getCompanyShipments('company-1', { page: 1, pageSize: 20, keyword: 'MSCU' });

      expect(prisma.shipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            OR: [
              { containerNo: { contains: 'MSCU' } },
              { blNo: { contains: 'MSCU' } },
              { shipName: { contains: 'MSCU' } },
            ],
          }),
        })
      );
    });

    it('should use default pagination values', async () => {
      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(0);

      await service.getCompanyShipments('company-1', {});

      expect(prisma.shipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('should include latest node for each shipment', async () => {
      const shipmentWithNode = {
        ...mockShipment,
        nodes: [{ id: 'node-1', nodeName: 'Departure' }],
      };

      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([shipmentWithNode] as any);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(1);

      const result = await service.getCompanyShipments('company-1', { page: 1, pageSize: 20 });

      expect(result.list[0].nodes).toBeDefined();
    });

    it('should include order info', async () => {
      const shipmentWithOrder = {
        ...mockShipment,
        order: { id: 'order-1', orderNo: 'ORD202401010001' },
      };

      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([shipmentWithOrder] as any);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(1);

      const result = await service.getCompanyShipments('company-1', { page: 1, pageSize: 20 });

      expect(result.list[0].order).toBeDefined();
    });
  });

  describe('getShipmentDetail', () => {
    it('should return shipment detail by id', async () => {
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(mockShipment as any);

      const result = await service.getShipmentDetail('shipment-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('shipment-1');
      expect(result.nodes).toHaveLength(2);
      expect(prisma.shipment.findUnique).toHaveBeenCalledWith({
        where: { id: 'shipment-1' },
        include: {
          nodes: {
            orderBy: { eventTime: 'desc' },
          },
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
              type: true,
              status: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when shipment not found', async () => {
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);

      await expect(service.getShipmentDetail('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('isDataStale', () => {
    it('should return true if lastSyncAt is null', async () => {
      jest.spyOn(prisma.shipment, 'findUnique')
        .mockResolvedValueOnce({
          ...mockShipment,
          lastSyncAt: null,
        } as any)
        .mockResolvedValueOnce(mockShipment as any);
      
      jest.spyOn(syncService, 'syncContainer').mockResolvedValue({} as any);

      await service.trackContainer('MSCU1234567', 'company-1');

      expect(syncService.syncContainer).toHaveBeenCalled();
    });

    it('should return true if data is older than 1 hour', async () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValueOnce({
        ...mockShipment,
        lastSyncAt: oldDate,
      } as any);
      jest.spyOn(syncService, 'syncContainer').mockResolvedValue({} as any);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValueOnce(mockShipment as any);

      await service.trackContainer('MSCU1234567', 'company-1');

      expect(syncService.syncContainer).toHaveBeenCalled();
    });

    it('should return false if data is fresh (less than 1 hour)', async () => {
      const freshDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue({
        ...mockShipment,
        lastSyncAt: freshDate,
      } as any);

      await service.trackContainer('MSCU1234567');

      expect(syncService.syncContainer).not.toHaveBeenCalled();
    });

    it('should return true if data is exactly 1 hour old', async () => {
      const exactHour = new Date(Date.now() - 60 * 60 * 1000 - 1); // Slightly more than 1 hour ago
      
      jest.spyOn(prisma.shipment, 'findUnique')
        .mockResolvedValueOnce({
          ...mockShipment,
          lastSyncAt: exactHour,
        } as any)
        .mockResolvedValueOnce(mockShipment as any);
      
      jest.spyOn(syncService, 'syncContainer').mockResolvedValue({} as any);

      await service.trackContainer('MSCU1234567', 'company-1');

      expect(syncService.syncContainer).toHaveBeenCalled();
    });
  });
});
