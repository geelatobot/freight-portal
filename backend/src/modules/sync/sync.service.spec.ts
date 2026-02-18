import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './services/sync.service';
import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { FourPortunService } from './services/fourportun.service';
import { WinstonLoggerService } from '../../common/logger/winston-logger.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: PrismaClient;
  let fourPortunService: FourPortunService;

  const mockTrackingData = {
    containerNo: 'MSCU1234567',
    blNo: 'BL123456789',
    bookingNo: 'BK987654321',
    carrierCode: 'MSC',
    carrierName: 'Mediterranean Shipping Company',
    originPort: 'CNSHA',
    destinationPort: 'USLAX',
    etd: '2024-02-01T00:00:00Z',
    eta: '2024-02-15T00:00:00Z',
    atd: null,
    ata: null,
    status: 'DEPARTURE',
    nodes: [
      {
        nodeCode: 'GATE_IN',
        nodeName: 'Gate In',
        location: 'Shanghai',
        eventTime: '2024-01-30T08:00:00Z',
        description: 'Container gated in',
        operator: 'Terminal',
      },
      {
        nodeCode: 'DEPARTURE',
        nodeName: 'Departure',
        location: 'Shanghai',
        eventTime: '2024-02-01T10:00:00Z',
        description: 'Vessel departed',
        operator: 'MSC',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaClient,
          useValue: {
            shipment: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            shipmentNode: {
              upsert: jest.fn(),
            },
            syncLog: {
              create: jest.fn(),
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: FourPortunService,
          useValue: {
            trackContainer: jest.fn(),
          },
        },
        {
          provide: WinstonLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaClient>(PrismaClient);
    fourPortunService = module.get<FourPortunService>(FourPortunService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncContainer', () => {
    it('should sync container data from 4portun', async () => {
      const containerNo = 'MSCU1234567';
      const companyId = 'company-1';

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(mockTrackingData);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockResolvedValue({ id: 'shipment-1', containerNo } as any);
      jest.spyOn(prisma.shipmentNode, 'upsert').mockResolvedValue({} as any);

      const result = await service.syncContainer(containerNo, companyId);

      expect(fourPortunService.trackContainer).toHaveBeenCalledWith(containerNo);
      expect(prisma.shipment.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle missing optional fields', async () => {
      const containerNo = 'MSCU1234567';
      const minimalData = {
        containerNo,
        status: 'BOOKED',
        nodes: [],
      };

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(minimalData as any);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockResolvedValue({ id: 'shipment-1' } as any);

      await service.syncContainer(containerNo);

      expect(prisma.shipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            containerNo,
            shipmentNo: expect.stringMatching(/^SH\d+$/),
            blNo: undefined,
          }),
        })
      );
    });

    it('should sync nodes when available', async () => {
      const containerNo = 'MSCU1234567';

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(mockTrackingData);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockResolvedValue({ id: 'shipment-1' } as any);
      jest.spyOn(prisma.shipmentNode, 'upsert').mockResolvedValue({} as any);

      await service.syncContainer(containerNo);

      expect(prisma.shipmentNode.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.shipmentNode.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            shipmentId_nodeCode_eventTime: {
              shipmentId: 'shipment-1',
              nodeCode: 'GATE_IN',
              eventTime: expect.any(Date),
            },
          },
        })
      );
    });

    it('should handle sync without nodes', async () => {
      const containerNo = 'MSCU1234567';
      const dataWithoutNodes = {
        ...mockTrackingData,
        nodes: null,
      };

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(dataWithoutNodes);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockResolvedValue({ id: 'shipment-1' } as any);

      await service.syncContainer(containerNo);

      expect(prisma.shipmentNode.upsert).not.toHaveBeenCalled();
    });

    it('should handle sync with empty nodes array', async () => {
      const containerNo = 'MSCU1234567';
      const dataWithEmptyNodes = {
        ...mockTrackingData,
        nodes: [],
      };

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(dataWithEmptyNodes);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockResolvedValue({ id: 'shipment-1' } as any);

      await service.syncContainer(containerNo);

      expect(prisma.shipmentNode.upsert).not.toHaveBeenCalled();
    });

    it('should handle 4portun API errors', async () => {
      const containerNo = 'MSCU1234567';

      jest.spyOn(fourPortunService, 'trackContainer').mockRejectedValue(new Error('API Error'));

      // syncContainer 在错误时返回错误对象而不是抛出异常
      const result = await service.syncContainer(containerNo);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('API Error');
    });

    it('should set currentNode to last node', async () => {
      const containerNo = 'MSCU1234567';

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(mockTrackingData);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockImplementation((args: any): any => {
        // Verify currentNode is set to the last node's code
        expect(args.data.currentNode).toBe('DEPARTURE');
        return Promise.resolve({ id: 'shipment-1' } as any);
      });

      await service.syncContainer(containerNo);
    });

    it('should set syncSource to 4portun', async () => {
      const containerNo = 'MSCU1234567';

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(mockTrackingData);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockImplementation((args: any): any => {
        expect(args.data.syncSource).toBe('4portun');
        return Promise.resolve({ id: 'shipment-1' } as any);
      });

      await service.syncContainer(containerNo);
    });

    it('should update lastSyncAt timestamp', async () => {
      const containerNo = 'MSCU1234567';
      const beforeSync = new Date();

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(mockTrackingData);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockImplementation((args: any): any => {
        expect(args.data.lastSyncAt).toBeInstanceOf(Date);
        expect(args.data.lastSyncAt.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
        return Promise.resolve({ id: 'shipment-1' } as any);
      });

      await service.syncContainer(containerNo);
    });

    it('should handle date parsing for etd, eta, atd, ata', async () => {
      const containerNo = 'MSCU1234567';
      const dataWithDates = {
        ...mockTrackingData,
        atd: '2024-02-01T10:00:00Z',
        ata: '2024-02-15T14:00:00Z',
      };

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(dataWithDates);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockImplementation((args: any): any => {
        expect(args.data.etd).toBeInstanceOf(Date);
        expect(args.data.eta).toBeInstanceOf(Date);
        expect(args.data.atd).toBeInstanceOf(Date);
        expect(args.data.ata).toBeInstanceOf(Date);
        return Promise.resolve({ id: 'shipment-1' } as any);
      });

      await service.syncContainer(containerNo);
    });

    it('should handle null dates', async () => {
      const containerNo = 'MSCU1234567';
      const dataWithNullDates = {
        ...mockTrackingData,
        etd: null,
        eta: null,
        atd: null,
        ata: null,
      };

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(dataWithNullDates);
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.shipment, 'create').mockImplementation((args: any): any => {
        expect(args.data.etd).toBeNull();
        expect(args.data.eta).toBeNull();
        expect(args.data.atd).toBeNull();
        expect(args.data.ata).toBeNull();
        return Promise.resolve({ id: 'shipment-1' } as any);
      });

      await service.syncContainer(containerNo);
    });
  });

  describe('status mapping', () => {
    it('should map BOOKED status correctly', async () => {
      await testStatusMapping('BOOKED', 'BOOKED');
    });

    it('should map EMPTY_PICKUP status correctly', async () => {
      await testStatusMapping('EMPTY_PICKUP', 'EMPTY_PICKUP');
    });

    it('should map GATE_IN status correctly', async () => {
      await testStatusMapping('GATE_IN', 'GATE_IN');
    });

    it('should map CUSTOMS_RELEASED status correctly', async () => {
      await testStatusMapping('CUSTOMS_RELEASED', 'CUSTOMS_RELEASED');
    });

    it('should map TERMINAL_RELEASED status correctly', async () => {
      await testStatusMapping('TERMINAL_RELEASED', 'TERMINAL_RELEASED');
    });

    it('should map DEPARTURE status correctly', async () => {
      await testStatusMapping('DEPARTURE', 'DEPARTURE');
    });

    it('should map ARRIVAL status correctly', async () => {
      await testStatusMapping('ARRIVAL', 'ARRIVAL');
    });

    it('should map DISCHARGED status correctly', async () => {
      await testStatusMapping('DISCHARGED', 'DISCHARGED');
    });

    it('should map FULL_PICKUP status correctly', async () => {
      await testStatusMapping('FULL_PICKUP', 'FULL_PICKUP');
    });

    it('should map EMPTY_RETURN status correctly', async () => {
      await testStatusMapping('EMPTY_RETURN', 'EMPTY_RETURN');
    });

    it('should map COMPLETED status correctly', async () => {
      await testStatusMapping('COMPLETED', 'COMPLETED');
    });

    it('should default to BOOKED for unknown status', async () => {
      await testStatusMapping('UNKNOWN_STATUS', 'BOOKED');
    });

    async function testStatusMapping(inputStatus: string, expectedStatus: string) {
      const containerNo = 'MSCU1234567';
      const data = {
        ...mockTrackingData,
        containerNo,
        status: inputStatus,
      };

      jest.spyOn(fourPortunService, 'trackContainer').mockResolvedValue(data as any);
      jest.spyOn(prisma.shipment, 'upsert').mockImplementation((args: any): any => {
        expect(args.update.status).toBe(expectedStatus);
        expect(args.create.status).toBe(expectedStatus);
        return Promise.resolve({ id: 'shipment-1' } as any);
      });

      await service.syncContainer(containerNo);
    }
  });
});
