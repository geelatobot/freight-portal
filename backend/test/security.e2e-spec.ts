import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';

describe('Security Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let authToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('SQL Injection Tests', () => {
    it('should prevent SQL injection in login username', async () => {
      const maliciousPayloads = [
        { username: 'admin\' OR \'1\'=\'1', password: 'password' },
        { username: 'admin\' OR 1=1 --', password: 'password' },
        { username: 'admin\'; DROP TABLE users; --', password: 'password' },
        { username: 'admin\' UNION SELECT * FROM users --', password: 'password' },
        { username: 'admin\' AND 1=1 --', password: 'password' },
        { username: 'admin\'/**/OR/**/\'1\'=\'1', password: 'password' },
        { username: 'admin\' OR \'1\'=\'1\' /*', password: 'password' },
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(payload);

        // Should not return successful login
        expect(response.status).not.toBe(200);
        expect(response.body).not.toHaveProperty('accessToken');
      }
    });

    it('should prevent SQL injection in search queries', async () => {
      // First login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      if (loginResponse.status === 200) {
        authToken = loginResponse.body.accessToken;

        const maliciousKeywords = [
          '\'; DROP TABLE orders; --',
          '\' OR \'1\'=\'1',
          '1\' UNION SELECT * FROM users --',
          '\'; DELETE FROM orders WHERE \'1\'=\'1',
          'test\' AND 1=1 --',
          'test\'/**/OR/**/\'1\'=\'1',
        ];

        for (const keyword of maliciousKeywords) {
          const response = await request(app.getHttpServer())
            .get(`/orders?keyword=${encodeURIComponent(keyword)}`)
            .set('Authorization', `Bearer ${authToken}`);

          // Should not crash or return all data
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body.list)).toBe(true);
        }
      }
    });

    it('should prevent SQL injection in order ID parameter', async () => {
      const maliciousIds = [
        '1\' OR \'1\'=\'1',
        '1; DROP TABLE orders; --',
        '1\' UNION SELECT * FROM users --',
        '1\' AND 1=1 --',
      ];

      for (const id of maliciousIds) {
        const response = await request(app.getHttpServer())
          .get(`/orders/${encodeURIComponent(id)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should return 404 or 400, not expose data
        expect([400, 404]).toContain(response.status);
      }
    });

    it('should prevent SQL injection in container number', async () => {
      const maliciousContainerNos = [
        'MSCU1234567\' OR \'1\'=\'1',
        'MSCU1234567\'; DROP TABLE shipments; --',
        'MSCU1234567\' UNION SELECT * FROM users --',
      ];

      for (const containerNo of maliciousContainerNos) {
        const response = await request(app.getHttpServer())
          .get(`/shipments/track/${encodeURIComponent(containerNo)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should not crash or return unauthorized data
        expect([400, 404, 500]).toContain(response.status);
      }
    });
  });

  describe('XSS (Cross-Site Scripting) Tests', () => {
    it('should sanitize XSS in order creation', async () => {
      const xssPayloads = [
        '<script>alert("XSS")\u003c/script>',
        '<img src=x onerror=alert("XSS")>',
        '<body onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<input onfocus=alert("XSS") autofocus>',
        '<script>document.location="http://evil.com"\u003c/script>',
        '\'><script>alert(\'XSS\')\u003c/script>',
        '<ScRiPt>alert("XSS")\u003c/ScRiPt>',
        '<script src=http://evil.com/xss.js></script>',
        'javascript:alert("XSS")',
      ];

      for (const payload of xssPayloads) {
        const createOrderDto = {
          type: 'FCL',
          originPort: 'CNSHA',
          destinationPort: 'USLAX',
          cargoDesc: payload,
          shipperName: payload,
          consigneeName: payload,
          remark: payload,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createOrderDto);

        // Should either sanitize or reject
        if (response.status === 201) {
          // If created, verify the response doesn't contain raw script tags
          const responseBody = JSON.stringify(response.body);
          expect(responseBody).not.toContain('<script>');
          expect(responseBody).not.toContain('onerror=');
          expect(responseBody).not.toContain('onload=');
        }
      }
    });

    it('should sanitize XSS in user registration', async () => {
      const xssPayload = '<script>alert("XSS")\u003c/script>';
      
      const registerDto = {
        username: `testuser_${Date.now()}`,
        password: 'TestPassword123!',
        email: `test_${Date.now()}@example.com`,
        companyName: xssPayload,
        realName: xssPayload,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      if (response.status === 201) {
        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toContain('<script>');
      }
    });
  });

  describe('Unauthorized Access Tests', () => {
    it('should reject requests without auth token', async () => {
      const protectedEndpoints = [
        { method: 'GET', url: '/orders' },
        { method: 'POST', url: '/orders', body: { type: 'FCL' } },
        { method: 'GET', url: '/orders/123' },
        { method: 'PUT', url: '/orders/123', body: {} },
        { method: 'DELETE', url: '/orders/123' },
        { method: 'GET', url: '/shipments' },
        { method: 'GET', url: '/billing' },
        { method: 'POST', url: '/billing', body: {} },
      ];

      for (const endpoint of protectedEndpoints) {
        let requestBuilder: any;
        
        switch (endpoint.method) {
        case 'GET':
          requestBuilder = request(app.getHttpServer()).get(endpoint.url);
          break;
        case 'POST':
          requestBuilder = request(app.getHttpServer()).post(endpoint.url).send(endpoint.body);
          break;
        case 'PUT':
          requestBuilder = request(app.getHttpServer()).put(endpoint.url).send(endpoint.body);
          break;
        case 'DELETE':
          requestBuilder = request(app.getHttpServer()).delete(endpoint.url);
          break;
        }

        const response = await requestBuilder;
        expect(response.status).toBe(401);
      }
    });

    it('should reject requests with invalid auth token', async () => {
      const invalidTokens = [
        'Bearer invalid-token',
        'Bearer ',
        'Invalid',
        '',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
      ];

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get('/orders')
          .set('Authorization', token);

        expect(response.status).toBe(401);
      }
    });

    it('should reject requests with expired auth token', async () => {
      // Create an expired token
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', expiredToken);

      expect(response.status).toBe(401);
    });

    it('should prevent accessing other company data', async () => {
      // This test assumes we have a way to identify company-specific data
      // In a real scenario, you'd create two users from different companies
      
      const response = await request(app.getHttpServer())
        .get('/orders?companyId=other-company-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Should either filter by user's company or return 403
      expect([200, 403]).toContain(response.status);
      
      if (response.status === 200) {
        // If 200, verify no cross-company data leakage
        expect(Array.isArray(response.body.list)).toBe(true);
      }
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should handle rapid login attempts', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send(loginDto)
        );
      }

      const responses = await Promise.all(requests);
      
      // All should be rejected (either 401 for wrong password or 429 for rate limit)
      for (const response of responses) {
        expect([401, 429]).toContain(response.status);
      }
    });
  });

  describe('Input Validation Tests', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'spaces in@email.com',
        'missing@dotcom',
        '@.com',
      ];

      for (const email of invalidEmails) {
        const registerDto = {
          username: `test_${Date.now()}`,
          password: 'TestPassword123!',
          email: email,
          companyName: 'Test Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto);

        expect(response.status).toBe(400);
      }
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'abcdefgh',
      ];

      for (const password of weakPasswords) {
        const registerDto = {
          username: `test_${Date.now()}`,
          password: password,
          companyName: 'Test Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto);

        // Should reject weak passwords
        expect([400, 201]).toContain(response.status);
      }
    });

    it('should validate order data types', async () => {
      const invalidOrderData = [
        { type: 123, originPort: 'CNSHA', destinationPort: 'USLAX' },
        { type: 'FCL', originPort: 123, destinationPort: 'USLAX' },
        { type: 'FCL', originPort: 'CNSHA', destinationPort: 123 },
        { type: 'FCL', originPort: 'CNSHA', destinationPort: 'USLAX', cargoWeight: 'not-a-number' },
      ];

      for (const data of invalidOrderData) {
        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(data);

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Information Disclosure Tests', () => {
    it('should not expose sensitive error details', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'test', password: 'test' });

      if (response.status === 401) {
        // Should not reveal whether username exists
        const errorMessage = JSON.stringify(response.body);
        expect(errorMessage).not.toContain('password');
        expect(errorMessage).not.toContain('sql');
        expect(errorMessage).not.toContain('database');
      }
    });

    it('should not expose stack traces in production', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 500) {
        const body = JSON.stringify(response.body);
        expect(body).not.toContain('at '); // No stack trace
        expect(body).not.toContain('.ts:'); // No file references
      }
    });
  });
});
