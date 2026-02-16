import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentService } from './shipment.service';
import { PrismaClient } from '@prisma/client';

describe('ShipmentService', () => {
  let service: ShipmentService;
  let prisma: PrismaClient;
  let syncService: any;

  beforeEach(async () => {
    syncService = {
      syncContainer: jest.fn(),
    };

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
            },
            shipmentNode: {
              upsert: jest.fn(),
            },
          },
        },
        {
          provide: 'SyncService',
          useValue: syncService,
        },
      ],
    }).compile();

    service = module.get<ShipmentService>(ShipmentService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackContainer', () => {
    it('should return shipment from database if exists', async () => {
      const mockShipment = {
        id: '1',
        containerNo: 'MSCU1234567',
        status: 'DEPARTURE',
        nodes: [],
        company: { id: '1', companyName: 'Test' },
      };

      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(mockShipment as any);

      const result = await service.trackContainer('MSCU1234567');

      expect(result).toBeDefined();
      expect(result.containerNo).toBe('MSCU1234567');
    });

    it('should sync from 4portun if not in database', async () => {
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      syncService.syncContainer.mockResolvedValue({ id: '1', containerNo: 'MSCU1234567' });

      const result = await service.trackContainer('MSCU1234567', 'company1');

      expect(syncService.syncContainer).toHaveBeenCalledWith('MSCU1234567', 'company1');
    });
  });

  describe('getCompanyShipments', () => {
    it('should return paginated shipments', async () => {
      const mockShipments = [
        { id: '1', containerNo: 'MSCU1', status: 'DEPARTURE' },
        { id: '2', containerNo: 'MSCU2', status: 'ARRIVAL' },
      ];

      jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue(mockShipments as any);
      jest.spyOn(prisma.shipment, 'count').mockResolvedValue(2);

      const result = await service.getCompanyShipments('company1', { page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });
});
