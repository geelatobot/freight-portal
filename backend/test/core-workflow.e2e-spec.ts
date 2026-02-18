import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Core Workflow E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let authToken: string;
  let refreshToken: string;
  let userId: string;
  let companyId: string;
  let orderId: string;
  let containerNo: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = new PrismaClient();
    
    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanupTestData() {
    try {
      await prisma.shipmentNode.deleteMany({
        where: { shipment: { containerNo: { startsWith: 'TEST' } } },
      });
      await prisma.shipment.deleteMany({
        where: { containerNo: { startsWith: 'TEST' } },
      });
      await prisma.billItem.deleteMany({
        where: { bill: { billNo: { startsWith: 'TEST' } } },
      });
      await prisma.bill.deleteMany({
        where: { billNo: { startsWith: 'TEST' } },
      });
      await prisma.order.deleteMany({
        where: { orderNo: { startsWith: 'TEST' } },
      });
      await prisma.companyUser.deleteMany({
        where: { user: { username: { startsWith: 'testuser_' } } },
      });
      await prisma.company.deleteMany({
        where: { companyName: { startsWith: 'Test Company' } },
      });
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'testuser_' } },
      });
    } catch (error) {
      console.log('Cleanup error (may be expected):', error.message);
    }
  }

  describe('Workflow 1: User Registration → Login → Query Shipments', () => {
    const testUsername = `testuser_${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;
    const testPhone = `138${String(Date.now()).slice(-8)}`;

    it('Step 1: Register a new user', async () => {
      const registerDto = {
        username: testUsername,
        password: 'TestPassword123!',
        email: testEmail,
        phone: testPhone,
        companyName: `Test Company ${Date.now()}`,
        realName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.username).toBe(testUsername);
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.company.status).toBe('PENDING');

      authToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
      companyId = response.body.company.id;
    });

    it('Step 2: Login with registered credentials', async () => {
      const loginDto = {
        username: testUsername,
        password: 'TestPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.username).toBe(testUsername);
      expect(response.body.companies).toBeInstanceOf(Array);
      expect(response.body.companies.length).toBeGreaterThan(0);

      authToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('Step 3: Query shipments with auth token', async () => {
      const response = await request(app.getHttpServer())
        .get('/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.list)).toBe(true);
    });

    it('Step 4: Refresh token', async () => {
      const refreshDto = {
        refreshToken: refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');

      authToken = response.body.accessToken;
    });
  });

  describe('Workflow 2: Create Order → Review → Associate Shipment', () => {
    it('Step 1: Create a new order', async () => {
      const createOrderDto = {
        type: 'FCL',
        originPort: 'CNSHA',
        destinationPort: 'USLAX',
        cargoDesc: 'Test Electronics',
        cargoWeight: 1500,
        cargoVolume: 15,
        cargoPackageType: 'CTNS',
        cargoPackageCount: 150,
        containerType: '20GP',
        containerCount: 1,
        etd: '2024-12-01',
        eta: '2024-12-20',
        shipperName: 'Test Shipper Co',
        shipperAddress: '123 Test St, Shanghai',
        shipperContact: 'Shipper Contact',
        shipperPhone: '13800138000',
        consigneeName: 'Test Consignee Co',
        consigneeAddress: '456 Test Ave, Los Angeles',
        consigneeContact: 'Consignee Contact',
        consigneePhone: '1234567890',
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderNo');
      expect(response.body.orderNo).toMatch(/^ORD\d{12}$/);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.cargoDesc).toBe('Test Electronics');

      orderId = response.body.id;
    });

    it('Step 2: Get order details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.status).toBe('PENDING');
    });

    it('Step 3: Update order (review process)', async () => {
      const updateDto = {
        cargoDesc: 'Updated Electronics - Reviewed',
        cargoWeight: 1600,
        remark: 'Order reviewed and updated',
      };

      const response = await request(app.getHttpServer())
        .put(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.cargoDesc).toBe('Updated Electronics - Reviewed');
      expect(response.body.cargoWeight).toBe(1600);
    });

    it('Step 4: Query orders list', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.list.length).toBeGreaterThan(0);
      const createdOrder = response.body.list.find((o: any) => o.id === orderId);
      expect(createdOrder).toBeDefined();
    });
  });

  describe('Workflow 3: Bill Generation → Payment → Invoice', () => {
    let billId: string;

    it('Step 1: Create a bill for the order', async () => {
      const createBillDto = {
        companyId: companyId,
        orderId: orderId,
        billType: 'FREIGHT',
        amount: '15800',
        currency: 'CNY',
        items: [
          { itemCode: 'OCEAN', itemName: '海运费', quantity: 1, unit: 'UNIT', unitPrice: '10000', amount: '10000' },
          { itemCode: 'THC', itemName: '码头操作费', quantity: 1, unit: 'UNIT', unitPrice: '3000', amount: '3000' },
          { itemCode: 'DOC', itemName: '文件费', quantity: 1, unit: 'UNIT', unitPrice: '500', amount: '500' },
          { itemCode: 'SEAL', itemName: '封条费', quantity: 1, unit: 'UNIT', unitPrice: '200', amount: '200' },
          { itemCode: 'AMS', itemName: 'AMS申报费', quantity: 1, unit: 'UNIT', unitPrice: '300', amount: '300' },
          { itemCode: 'ISPS', itemName: 'ISPS费', quantity: 1, unit: 'UNIT', unitPrice: '800', amount: '800' },
        ],
        remark: 'Freight charges for order',
      };

      const response = await request(app.getHttpServer())
        .post('/billing')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBillDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('billNo');
      expect(response.body.billNo).toMatch(/^BILL\d{12}$/);
      expect(response.body.status).toBe('ISSUED');
      expect(response.body.amount).toBe(15800);
      expect(response.body.items).toHaveLength(6);

      billId = response.body.id;
    });

    it('Step 2: Get bill details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/billing/${billId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(billId);
      expect(response.body.status).toBe('ISSUED');
      expect(response.body.items).toBeDefined();
    });

    it('Step 3: Confirm partial payment', async () => {
      const paymentDto = {
        amount: 8000,
        remark: 'First payment received',
      };

      const response = await request(app.getHttpServer())
        .post(`/billing/${billId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentDto)
        .expect(200);

      expect(response.body.status).toBe('PARTIAL_PAID');
      expect(response.body.paidAmount).toBe(8000);
    });

    it('Step 4: Confirm full payment', async () => {
      const paymentDto = {
        amount: 7800,
        remark: 'Final payment received',
      };

      const response = await request(app.getHttpServer())
        .post(`/billing/${billId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentDto)
        .expect(200);

      expect(response.body.status).toBe('PAID');
      expect(response.body.paidAmount).toBe(15800);
    });

    it('Step 5: Get billing statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalBills');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('paidAmount');
      expect(response.body).toHaveProperty('unpaidAmount');
    });
  });
});
