import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from './customer.service';
import { PrismaClient } from '@prisma/client';

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaClient,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            companyUser: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        realName: 'Test User',
        avatar: null,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.getProfile('1');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null for non-existent user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.getProfile('999');

      expect(result).toBeNull();
    });
  });

  describe('getCompanies', () => {
    it('should return list of companies for user', async () => {
      const mockCompanyUsers = [
        {
          company: {
            id: '1',
            companyName: 'Test Company',
            creditCode: '123456',
            contactName: 'Contact',
            contactPhone: '13800138000',
            creditLimit: 100000,
            creditUsed: 5000,
            status: 'ACTIVE',
          },
          role: 'ADMIN',
          isDefault: true,
        },
      ];

      jest.spyOn(prisma.companyUser, 'findMany').mockResolvedValue(mockCompanyUsers as any);

      const result = await service.getCompanies('1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Company');
      expect(result[0].role).toBe('ADMIN');
    });

    it('should return empty array for user with no companies', async () => {
      jest.spyOn(prisma.companyUser, 'findMany').mockResolvedValue([]);

      const result = await service.getCompanies('1');

      expect(result).toEqual([]);
    });
  });
});
