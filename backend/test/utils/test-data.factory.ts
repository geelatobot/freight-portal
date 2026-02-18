/**
 * TestDataFactory - 测试数据工厂
 * 
 * 生成标准测试数据对象，支持 Builder 模式覆盖默认值
 */

import { UserStatus, CompanyStatus, CompanyRole, OrderStatus, OrderType, BillStatus, BillType, ShipmentStatus } from '@prisma/client';

// ==================== User Builder ====================

export interface TestUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  realName: string | null;
  avatar: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  companyUsers?: TestCompanyUser[];
}

export interface TestCompanyUser {
  company: {
    id: string;
    companyName: string;
  };
  role: CompanyRole;
  isDefault: boolean;
}

export class UserBuilder {
  private data: TestUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    phone: '13800138000',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // bcrypt hash placeholder
    realName: 'Test User',
    avatar: null,
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    companyUsers: [
      {
        company: {
          id: 'company-1',
          companyName: 'Test Company',
        },
        role: CompanyRole.ADMIN,
        isDefault: true,
      },
    ],
  };

  withId(id: string): UserBuilder {
    this.data.id = id;
    return this;
  }

  withUsername(username: string): UserBuilder {
    this.data.username = username;
    return this;
  }

  withEmail(email: string | null): UserBuilder {
    this.data.email = email;
    return this;
  }

  withPhone(phone: string | null): UserBuilder {
    this.data.phone = phone;
    return this;
  }

  withPasswordHash(passwordHash: string): UserBuilder {
    this.data.passwordHash = passwordHash;
    return this;
  }

  withRealName(realName: string | null): UserBuilder {
    this.data.realName = realName;
    return this;
  }

  withStatus(status: UserStatus): UserBuilder {
    this.data.status = status;
    return this;
  }

  withLastLogin(lastLoginAt: Date | null, lastLoginIp: string | null = null): UserBuilder {
    this.data.lastLoginAt = lastLoginAt;
    this.data.lastLoginIp = lastLoginIp;
    return this;
  }

  withCompanyUsers(companyUsers: TestCompanyUser[]): UserBuilder {
    this.data.companyUsers = companyUsers;
    return this;
  }

  withoutCompanyUsers(): UserBuilder {
    delete this.data.companyUsers;
    return this;
  }

  build(): TestUser {
    return { ...this.data };
  }
}

// ==================== Company Builder ====================

export interface TestCompany {
  id: string;
  companyName: string;
  creditCode: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  creditLimit: string | null;
  creditUsed: string;
  status: CompanyStatus;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyBuilder {
  private data: TestCompany = {
    id: 'company-1',
    companyName: 'Test Company',
    creditCode: '91110000XXXXXXXXXX',
    address: 'Test Address, Shanghai',
    contactName: 'Contact Person',
    contactPhone: '13800138000',
    contactEmail: 'contact@company.com',
    creditLimit: '100000.00',
    creditUsed: '0.00',
    status: CompanyStatus.ACTIVE,
    remark: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  withId(id: string): CompanyBuilder {
    this.data.id = id;
    return this;
  }

  withCompanyName(companyName: string): CompanyBuilder {
    this.data.companyName = companyName;
    return this;
  }

  withCreditCode(creditCode: string | null): CompanyBuilder {
    this.data.creditCode = creditCode;
    return this;
  }

  withStatus(status: CompanyStatus): CompanyBuilder {
    this.data.status = status;
    return this;
  }

  withCreditLimit(limit: string | null): CompanyBuilder {
    this.data.creditLimit = limit;
    return this;
  }

  withCreditUsed(used: string): CompanyBuilder {
    this.data.creditUsed = used;
    return this;
  }

  build(): TestCompany {
    return { ...this.data };
  }
}

// ==================== Order Builder ====================

export interface TestOrder {
  id: string;
  orderNo: string;
  companyId: string;
  creatorId: string;
  type: OrderType;
  status: OrderStatus;
  subStatus: string | null;
  originPort: string;
  originPortName: string;
  destinationPort: string;
  destinationPortName: string;
  cargoDesc: string;
  cargoWeight: number | null;
  cargoVolume: number | null;
  cargoPackageType: string | null;
  cargoPackageCount: number | null;
  containerType: string | null;
  containerCount: number | null;
  etd: Date | null;
  eta: Date | null;
  shipperName: string | null;
  shipperAddress: string | null;
  shipperContact: string | null;
  shipperPhone: string | null;
  consigneeName: string | null;
  consigneeAddress: string | null;
  consigneeContact: string | null;
  consigneePhone: string | null;
  notifyName: string | null;
  notifyAddress: string | null;
  notifyContact: string | null;
  notifyPhone: string | null;
  remark: string | null;
  internalRemark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OrderBuilder {
  private data: TestOrder = {
    id: 'order-1',
    orderNo: 'ORD202401010001',
    companyId: 'company-1',
    creatorId: 'user-1',
    type: OrderType.FCL,
    status: OrderStatus.PENDING,
    subStatus: null,
    originPort: 'CNSHA',
    originPortName: 'Shanghai',
    destinationPort: 'USLAX',
    destinationPortName: 'Los Angeles',
    cargoDesc: 'Test cargo description',
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  withId(id: string): OrderBuilder {
    this.data.id = id;
    return this;
  }

  withOrderNo(orderNo: string): OrderBuilder {
    this.data.orderNo = orderNo;
    return this;
  }

  withCompanyId(companyId: string): OrderBuilder {
    this.data.companyId = companyId;
    return this;
  }

  withCreatorId(creatorId: string): OrderBuilder {
    this.data.creatorId = creatorId;
    return this;
  }

  withType(type: OrderType): OrderBuilder {
    this.data.type = type;
    return this;
  }

  withStatus(status: OrderStatus): OrderBuilder {
    this.data.status = status;
    return this;
  }

  withPorts(originPort: string, destinationPort: string): OrderBuilder {
    this.data.originPort = originPort;
    this.data.originPortName = originPort;
    this.data.destinationPort = destinationPort;
    this.data.destinationPortName = destinationPort;
    return this;
  }

  withCargo(cargoDesc: string, weight?: number, volume?: number): OrderBuilder {
    this.data.cargoDesc = cargoDesc;
    if (weight !== undefined) this.data.cargoWeight = weight;
    if (volume !== undefined) this.data.cargoVolume = volume;
    return this;
  }

  withContainer(type: string | null, count: number | null): OrderBuilder {
    this.data.containerType = type;
    this.data.containerCount = count;
    return this;
  }

  withDates(etd: Date | null, eta: Date | null): OrderBuilder {
    this.data.etd = etd;
    this.data.eta = eta;
    return this;
  }

  withShipper(name: string, address?: string, contact?: string, phone?: string): OrderBuilder {
    this.data.shipperName = name;
    if (address !== undefined) this.data.shipperAddress = address;
    if (contact !== undefined) this.data.shipperContact = contact;
    if (phone !== undefined) this.data.shipperPhone = phone;
    return this;
  }

  withConsignee(name: string, address?: string, contact?: string, phone?: string): OrderBuilder {
    this.data.consigneeName = name;
    if (address !== undefined) this.data.consigneeAddress = address;
    if (contact !== undefined) this.data.consigneeContact = contact;
    if (phone !== undefined) this.data.consigneePhone = phone;
    return this;
  }

  withRemark(remark: string | null): OrderBuilder {
    this.data.remark = remark;
    return this;
  }

  build(): TestOrder {
    return { ...this.data };
  }
}

// ==================== Shipment Builder ====================

export interface TestShipment {
  id: string;
  shipmentNo: string;
  orderId: string;
  companyId: string;
  status: ShipmentStatus;
  bookingNo: string | null;
  blNo: string | null;
  carrier: string | null;
  vessel: string | null;
  voyage: string | null;
  pol: string | null;
  pod: string | null;
  etd: Date | null;
  eta: Date | null;
  atd: Date | null;
  ata: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ShipmentBuilder {
  private data: TestShipment = {
    id: 'shipment-1',
    shipmentNo: 'SHP202401010001',
    orderId: 'order-1',
    companyId: 'company-1',
    status: ShipmentStatus.BOOKED,
    bookingNo: 'BK001',
    blNo: null,
    carrier: 'COSCO',
    vessel: 'COSCO SHANGHAI',
    voyage: 'V.001',
    pol: 'CNSHA',
    pod: 'USLAX',
    etd: new Date('2024-02-01'),
    eta: new Date('2024-02-15'),
    atd: null,
    ata: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  withId(id: string): ShipmentBuilder {
    this.data.id = id;
    return this;
  }

  withShipmentNo(shipmentNo: string): ShipmentBuilder {
    this.data.shipmentNo = shipmentNo;
    return this;
  }

  withOrderId(orderId: string): ShipmentBuilder {
    this.data.orderId = orderId;
    return this;
  }

  withCompanyId(companyId: string): ShipmentBuilder {
    this.data.companyId = companyId;
    return this;
  }

  withStatus(status: ShipmentStatus): ShipmentBuilder {
    this.data.status = status;
    return this;
  }

  withBookingNo(bookingNo: string | null): ShipmentBuilder {
    this.data.bookingNo = bookingNo;
    return this;
  }

  withBlNo(blNo: string | null): ShipmentBuilder {
    this.data.blNo = blNo;
    return this;
  }

  withCarrier(carrier: string | null): ShipmentBuilder {
    this.data.carrier = carrier;
    return this;
  }

  withVessel(vessel: string | null, voyage?: string | null): ShipmentBuilder {
    this.data.vessel = vessel;
    if (voyage !== undefined) this.data.voyage = voyage;
    return this;
  }

  withPorts(pol: string | null, pod: string | null): ShipmentBuilder {
    this.data.pol = pol;
    this.data.pod = pod;
    return this;
  }

  withDates(etd: Date | null, eta: Date | null): ShipmentBuilder {
    this.data.etd = etd;
    this.data.eta = eta;
    return this;
  }

  withActualDates(atd: Date | null, ata: Date | null): ShipmentBuilder {
    this.data.atd = atd;
    this.data.ata = ata;
    return this;
  }

  build(): TestShipment {
    return { ...this.data };
  }
}

// ==================== Bill Builder ====================

export interface TestBillItem {
  id: string;
  billId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  currency: string;
}

export interface TestBill {
  id: string;
  billNo: string;
  companyId: string;
  orderId: string;
  billType: BillType;
  amount: number;
  paidAmount: number;
  currency: string;
  status: BillStatus;
  issueDate: Date;
  dueDate: Date | null;
  paidDate: Date | null;
  remark: string | null;
  items: TestBillItem[];
  company?: {
    id: string;
    companyName: string;
  };
  order?: {
    id: string;
    orderNo: string;
  };
  invoice?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class BillBuilder {
  private data: TestBill = {
    id: 'bill-1',
    billNo: 'BILL202401010001',
    companyId: 'company-1',
    orderId: 'order-1',
    billType: BillType.FREIGHT,
    amount: 15800,
    paidAmount: 0,
    currency: 'CNY',
    status: BillStatus.ISSUED,
    issueDate: new Date('2024-01-01'),
    dueDate: new Date('2024-02-01'),
    paidDate: null,
    remark: 'Freight charges',
    items: [
      {
        id: 'item-1',
        billId: 'bill-1',
        itemCode: 'OCEAN',
        itemName: '海运费',
        quantity: 1,
        unit: 'UNIT',
        unitPrice: 10000,
        amount: 10000,
        currency: 'CNY',
      },
      {
        id: 'item-2',
        billId: 'bill-1',
        itemCode: 'THC',
        itemName: '码头操作费',
        quantity: 1,
        unit: 'UNIT',
        unitPrice: 3000,
        amount: 3000,
        currency: 'CNY',
      },
    ],
    company: {
      id: 'company-1',
      companyName: 'Test Company',
    },
    order: {
      id: 'order-1',
      orderNo: 'ORD202401010001',
    },
    invoice: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  withId(id: string): BillBuilder {
    this.data.id = id;
    return this;
  }

  withBillNo(billNo: string): BillBuilder {
    this.data.billNo = billNo;
    return this;
  }

  withCompanyId(companyId: string): BillBuilder {
    this.data.companyId = companyId;
    return this;
  }

  withOrderId(orderId: string): BillBuilder {
    this.data.orderId = orderId;
    return this;
  }

  withBillType(billType: BillType): BillBuilder {
    this.data.billType = billType;
    return this;
  }

  withAmount(amount: number): BillBuilder {
    this.data.amount = amount;
    return this;
  }

  withPaidAmount(paidAmount: number): BillBuilder {
    this.data.paidAmount = paidAmount;
    return this;
  }

  withCurrency(currency: string): BillBuilder {
    this.data.currency = currency;
    return this;
  }

  withStatus(status: BillStatus): BillBuilder {
    this.data.status = status;
    return this;
  }

  withDates(issueDate: Date, dueDate?: Date | null, paidDate?: Date | null): BillBuilder {
    this.data.issueDate = issueDate;
    if (dueDate !== undefined) this.data.dueDate = dueDate;
    if (paidDate !== undefined) this.data.paidDate = paidDate;
    return this;
  }

  withItems(items: TestBillItem[]): BillBuilder {
    this.data.items = items;
    return this;
  }

  withCompany(company: { id: string; companyName: string } | null): BillBuilder {
    this.data.company = company || undefined;
    return this;
  }

  withOrder(order: { id: string; orderNo: string } | null): BillBuilder {
    this.data.order = order || undefined;
    return this;
  }

  withRemark(remark: string | null): BillBuilder {
    this.data.remark = remark;
    return this;
  }

  build(): TestBill {
    return { ...this.data };
  }
}

// ==================== Bill Item Builder ====================

export class BillItemBuilder {
  private data: TestBillItem = {
    id: 'item-1',
    billId: 'bill-1',
    itemCode: 'OCEAN',
    itemName: '海运费',
    quantity: 1,
    unit: 'UNIT',
    unitPrice: 10000,
    amount: 10000,
    currency: 'CNY',
  };

  withId(id: string): BillItemBuilder {
    this.data.id = id;
    return this;
  }

  withBillId(billId: string): BillItemBuilder {
    this.data.billId = billId;
    return this;
  }

  withItemCode(itemCode: string): BillItemBuilder {
    this.data.itemCode = itemCode;
    return this;
  }

  withItemName(itemName: string): BillItemBuilder {
    this.data.itemName = itemName;
    return this;
  }

  withQuantity(quantity: number): BillItemBuilder {
    this.data.quantity = quantity;
    return this;
  }

  withUnit(unit: string): BillItemBuilder {
    this.data.unit = unit;
    return this;
  }

  withUnitPrice(unitPrice: number): BillItemBuilder {
    this.data.unitPrice = unitPrice;
    return this;
  }

  withAmount(amount: number): BillItemBuilder {
    this.data.amount = amount;
    return this;
  }

  withCurrency(currency: string): BillItemBuilder {
    this.data.currency = currency;
    return this;
  }

  build(): TestBillItem {
    return { ...this.data };
  }
}

// ==================== Factory Methods ====================

export class TestDataFactory {
  static user(): UserBuilder {
    return new UserBuilder();
  }

  static company(): CompanyBuilder {
    return new CompanyBuilder();
  }

  static order(): OrderBuilder {
    return new OrderBuilder();
  }

  static shipment(): ShipmentBuilder {
    return new ShipmentBuilder();
  }

  static bill(): BillBuilder {
    return new BillBuilder();
  }

  static billItem(): BillItemBuilder {
    return new BillItemBuilder();
  }
}
