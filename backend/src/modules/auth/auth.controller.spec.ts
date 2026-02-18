import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { createTestApp, createJwtAuthGuardMock, DEFAULT_MOCK_USER } from '../../../test/utils/test-module.util';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(require('./guards/jwt-auth.guard').JwtAuthGuard)
      .useValue(createJwtAuthGuardMock(DEFAULT_MOCK_USER))
      .compile();

    app = await createTestApp({ module });
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
        },
        companies: [
          {
            id: 'company-1',
            name: 'Test Company',
            role: 'ADMIN',
            isDefault: true,
          },
        ],
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockResponse);
          expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
        });
    });

    it('should return 401 for invalid credentials', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new (require('@nestjs/common').UnauthorizedException)('Invalid credentials'));

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const loginDto = {
        username: '',
        password: '',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);
    });

    it('should accept login with email', async () => {
      const loginDto = {
        username: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue({ accessToken: 'token' });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);
    });

    it('should accept login with phone', async () => {
      const loginDto = {
        username: '13800138000',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue({ accessToken: 'token' });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);
    });

    it('should handle missing request body', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .expect(400);
    });
  });

  describe('POST /auth/register', () => {
    it('should register successfully with valid data', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
        email: 'new@example.com',
        phone: '13800138000',
        companyName: 'New Company',
        realName: 'New User',
      };

      const mockResponse = {
        user: {
          id: 'user-1',
          username: 'newuser',
          email: 'new@example.com',
        },
        company: {
          id: 'company-1',
          name: 'New Company',
          status: 'PENDING',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(mockResponse);
          expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
        });
    });

    it('should return 400 for duplicate username', async () => {
      const registerDto = {
        username: 'existinguser',
        password: 'password123',
        companyName: 'Test Company',
      };

      mockAuthService.register.mockRejectedValue(new (require('@nestjs/common').BadRequestException)('用户名、邮箱或手机号已存在'));

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should validate required fields', async () => {
      const registerDto = {
        username: '',
        password: '',
        companyName: '',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should validate password minimum length', async () => {
      const registerDto = {
        username: 'newuser',
        password: '123', // Too short
        companyName: 'Test Company',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should validate email format', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
        email: 'invalid-email',
        companyName: 'Test Company',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockResponse);
          expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshDto);
        });
    });

    it('should return 401 for invalid refresh token', async () => {
      const refreshDto = {
        refreshToken: 'invalid-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(new (require('@nestjs/common').UnauthorizedException)('Token已过期或无效'));

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(401);
    });

    it('should validate required refresh token', async () => {
      const refreshDto = {
        refreshToken: '',
      };

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(400);
    });

    it('should return 401 for expired refresh token', async () => {
      const refreshDto = {
        refreshToken: 'expired-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(new (require('@nestjs/common').UnauthorizedException)('Token已过期或无效'));

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(401);
    });
  });
});
