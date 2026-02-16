import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaClient,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens and user info on successful login', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        status: 'ACTIVE',
        companyUsers: [],
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

      const result = await service.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('testuser');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(
        service.login({ username: 'invalid', password: 'wrong' }),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('register', () => {
    it('should create new user and company', async () => {
      const mockUser = {
        id: '1',
        username: 'newuser',
        email: 'new@example.com',
        status: 'ACTIVE',
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        return callback({
          company: { create: jest.fn().mockResolvedValue({ id: '1', companyName: 'Test Co' }) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          companyUser: { create: jest.fn() },
        });
      });

      const result = await service.register({
        username: 'newuser',
        password: 'password123',
        email: 'new@example.com',
        companyName: 'Test Co',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw error for existing username', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({ id: '1' } as any);

      await expect(
        service.register({
          username: 'existing',
          password: 'password123',
          companyName: 'Test Co',
        }),
      ).rejects.toThrow('用户名、邮箱或手机号已存在');
    });
  });
});
