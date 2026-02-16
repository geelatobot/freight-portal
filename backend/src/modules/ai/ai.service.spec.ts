import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: PrismaClient,
          useValue: {
            shipment: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                KIMI_API_KEY: 'test-key',
                KIMI_API_URL: 'https://api.moonshot.cn/v1',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queryShipmentStatus', () => {
    it('should return shipment description when found', async () => {
      const mockShipment = {
        id: '1',
        containerNo: 'MSCU1234567',
        carrierName: 'MSC',
        originPortName: '上海',
        destinationPortName: '洛杉矶',
        nodes: [
          { nodeName: '船舶离港', eventTime: new Date(), location: '上海港' },
        ],
        company: { companyName: 'Test Co' },
      };

      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(mockShipment as any);

      const result = await service.queryShipmentStatus('MSCU1234567');

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.reply).toContain('MSCU1234567');
    });

    it('should return not found message when shipment not exists', async () => {
      jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);

      const result = await service.queryShipmentStatus('INVALID');

      expect(result.data).toBeNull();
      expect(result.reply).toContain('未找到');
    });
  });
});
