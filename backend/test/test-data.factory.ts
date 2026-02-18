import { OrderStatus, BillStatus } from '@prisma/client';

/**
 * 测试数据工厂
 * 用于生成测试用的 mock 数据
 */
export class TestDataFactory {
  /**
   * 创建 mock 用户
   */
  static createUser(overrides: Partial<any> = {}) {
    return {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      phone: '13800138000',
      passwordHash: 'hashed_password',
      status: 'ACTIVE',
      realName: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      lastLoginIp: null,
      ...overrides,
    };
  }

  /**
   * 创建 mock 公司
   */
  static createCompany(overrides: Partial<any> = {}) {
    return {
      id: 'company-1',
      companyName: 'Test Company',
      creditCode: '91110000123456789X',
      address: 'Test Address',
      contactName: 'Contact Person',
      contactPhone: '13800138000',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建 mock 订单
   */
  static createOrder(overrides: Partial<any> = {}) {
    return {
      id: 'order-1',
      orderNo: 'ORD202401010001',
      companyId: 'company-1',
      creatorId: 'user-1',
      type: 'FCL',
      status: OrderStatus.PENDING,
      originPort: 'CNSHA',
      originPortName: 'Shanghai',
      destinationPort: 'USLAX',
      destinationPortName: 'Los Angeles',
      cargoDesc: 'Test cargo',
      cargoWeight: 1000,
      cargoVolume: 10,
      cargoPackageType: 'CTNS',
      cargoPackageCount: 100,
      containerType: '20GP',
      containerCount: 1,
      etd: new Date('2024-02-01'),
      eta: new Date('2024-02-15'),
      shipperName: 'Shipper Co',
      shipperAddress: 'Shipper Address',
      shipperContact: 'Shipper Contact',
      shipperPhone: '1234567890',
      consigneeName: 'Consignee Co',
      consigneeAddress: 'Consignee Address',
      consigneeContact: 'Consignee Contact',
      consigneePhone: '0987654321',
      notifyName: 'Notify Co',
      notifyAddress: 'Notify Address',
      notifyContact: 'Notify Contact',
      notifyPhone: '1122334455',
      remark: 'Test remark',
      internalRemark: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建 mock 账单
   */
  static createBill(overrides: Partial<any> = {}) {
    return {
      id: 'bill-1',
      billNo: 'BILL202401010001',
      companyId: 'company-1',
      orderId: 'order-1',
      billType: 'FREIGHT',
      amount: 15800,
      paidAmount: 0,
      currency: 'CNY',
      status: BillStatus.ISSUED,
      issueDate: new Date(),
      dueDate: new Date('2024-02-01'),
      paidDate: null,
      remark: 'Freight charges',
      items: [
        this.createBillItem({ itemCode: 'OCEAN', itemName: '海运费', amount: 10000 }),
        this.createBillItem({ itemCode: 'THC', itemName: '码头操作费', amount: 3000 }),
      ],
      company: this.createCompany(),
      order: {
        id: 'order-1',
        orderNo: 'ORD202401010001',
      },
      invoice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建 mock 账单项目
   */
  static createBillItem(overrides: Partial<any> = {}) {
    return {
      id: 'item-1',
      billId: 'bill-1',
      itemCode: 'OCEAN',
      itemName: '海运费',
      quantity: 1,
      unit: 'UNIT',
      unitPrice: 10000,
      amount: 10000,
      currency: 'CNY',
      ...overrides,
    };
  }

  /**
   * 创建 mock 运单
   */
  static createShipment(overrides: Partial<any> = {}) {
    return {
      id: 'shipment-1',
      containerNo: 'MSCU1234567',
      orderId: 'order-1',
      status: 'IN_TRANSIT',
      carrier: 'MSC',
      vesselName: 'MSC OSCAR',
      voyageNo: 'VOY123',
      pol: 'CNSHA',
      pod: 'USLAX',
      etd: new Date('2024-02-01'),
      eta: new Date('2024-02-15'),
      atd: null,
      ata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建 mock 公司用户关联
   */
  static createCompanyUser(overrides: Partial<any> = {}) {
    return {
      id: 'cu-1',
      userId: 'user-1',
      companyId: 'company-1',
      role: 'ADMIN',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      company: this.createCompany(),
      ...overrides,
    };
  }

  /**
   * 创建 mock JWT Token payload
   */
  static createJwtPayload(overrides: Partial<any> = {}) {
    return {
      sub: 'user-1',
      username: 'testuser',
      ...overrides,
    };
  }

  /**
   * 创建 mock 登录 DTO
   */
  static createLoginDto(overrides: Partial<any> = {}) {
    return {
      username: 'testuser',
      password: 'password123',
      ...overrides,
    };
  }

  /**
   * 创建 mock 注册 DTO
   */
  static createRegisterDto(overrides: Partial<any> = {}) {
    return {
      username: 'newuser',
      password: 'password123',
      email: 'new@example.com',
      phone: '13900139000',
      companyName: 'New Company',
      realName: 'New User',
      ...overrides,
    };
  }

  /**
   * 创建 mock 创建订单 DTO
   */
  static createCreateOrderDto(overrides: Partial<any> = {}) {
    return {
      type: 'FCL',
      originPort: 'CNSHA',
      destinationPort: 'USLAX',
      cargoDesc: 'Electronics',
      cargoWeight: 5000,
      cargoVolume: 25,
      cargoPackageType: 'CTNS',
      cargoPackageCount: 500,
      containerType: '40HQ',
      containerCount: 2,
      etd: '2024-03-01',
      eta: '2024-03-20',
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
      ...overrides,
    };
  }

  /**
   * 创建 mock 创建账单 DTO
   */
  static createCreateBillDto(overrides: Partial<any> = {}) {
    return {
      companyId: 'company-1',
      orderId: 'order-1',
      billType: 'FREIGHT',
      amount: '15800',
      currency: 'CNY',
      items: [
        { itemCode: 'OCEAN', itemName: '海运费', quantity: 1, unit: 'UNIT', unitPrice: '10000', amount: '10000' },
        { itemCode: 'THC', itemName: '码头操作费', quantity: 1, unit: 'UNIT', unitPrice: '3000', amount: '3000' },
        { itemCode: 'DOC', itemName: '文件费', quantity: 1, unit: 'UNIT', unitPrice: '500', amount: '500' },
      ],
      remark: 'Freight charges for order ORD202401010001',
      ...overrides,
    };
  }
}
