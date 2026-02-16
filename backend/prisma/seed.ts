import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建系统管理员
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@freight-portal.com',
      passwordHash: adminPassword,
      realName: '系统管理员',
      status: 'ACTIVE',
    },
  });
  console.log('✅ 系统管理员创建成功:', admin.username);

  // 创建示例企业
  const company = await prisma.company.upsert({
    where: { creditCode: '91330000XXXXXXXX' },
    update: {},
    create: {
      companyName: '示例贸易公司',
      creditCode: '91330000XXXXXXXX',
      address: '浙江省杭州市滨江区',
      contactName: '张三',
      contactPhone: '13800138000',
      contactEmail: 'zhangsan@example.com',
      creditLimit: 100000,
      creditUsed: 0,
      status: 'ACTIVE',
    },
  });
  console.log('✅ 示例企业创建成功:', company.companyName);

  // 关联管理员和企业
  await prisma.companyUser.upsert({
    where: {
      userId_companyId: {
        userId: admin.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      companyId: company.id,
      role: 'ADMIN',
      isDefault: true,
    },
  });
  console.log('✅ 管理员与企业关联成功');

  // 创建示例订单
  const order = await prisma.order.create({
    data: {
      orderNo: 'ORD2024001001',
      companyId: company.id,
      creatorId: admin.id,
      type: 'FCL',
      status: 'CONFIRMED',
      originPort: 'CNSHA',
      originPortName: '上海',
      destinationPort: 'USLAX',
      destinationPortName: '洛杉矶',
      cargoDesc: '电子产品',
      cargoWeight: 15000,
      cargoVolume: 25,
      cargoPackageType: 'CTNS',
      cargoPackageCount: 500,
      containerType: '20GP',
      containerCount: 2,
      etd: new Date('2024-07-01'),
      eta: new Date('2024-07-15'),
      shipperName: '示例发货人',
      shipperAddress: '上海市浦东新区',
      shipperContact: '李四',
      shipperPhone: '13900139000',
      consigneeName: '示例收货人',
      consigneeAddress: 'Los Angeles, CA',
      consigneeContact: 'John Doe',
      consigneePhone: '+1-123-456-7890',
    },
  });
  console.log('✅ 示例订单创建成功:', order.orderNo);

  // 创建示例货物
  const shipment = await prisma.shipment.create({
    data: {
      shipmentNo: 'SH2024001001',
      orderId: order.id,
      companyId: company.id,
      containerNo: 'MSCU1234567',
      containerType: '20GP',
      blNo: 'SHAXXXXXX',
      bookingNo: 'BK2024001',
      carrierCode: 'MSC',
      carrierName: '地中海航运',
      status: 'DEPARTURE',
      currentNode: 'DEPARTURE',
      originPort: 'CNSHA',
      originPortName: '上海',
      destinationPort: 'USLAX',
      destinationPortName: '洛杉矶',
      etd: new Date('2024-07-01'),
      eta: new Date('2024-07-15'),
      atd: new Date('2024-07-01'),
      syncSource: '4portun',
      lastSyncAt: new Date(),
    },
  });
  console.log('✅ 示例货物创建成功:', shipment.containerNo);

  // 创建货物节点
  const nodes = [
    { nodeCode: 'BOOKED', nodeName: '已订舱', eventTime: new Date('2024-06-25') },
    { nodeCode: 'EMPTY_PICKUP', nodeName: '提空箱', eventTime: new Date('2024-06-28') },
    { nodeCode: 'GATE_IN', nodeName: '重箱进港', eventTime: new Date('2024-06-29') },
    { nodeCode: 'CUSTOMS_RELEASED', nodeName: '海关放行', eventTime: new Date('2024-06-30') },
    { nodeCode: 'DEPARTURE', nodeName: '船舶离港', eventTime: new Date('2024-07-01') },
  ];

  for (const node of nodes) {
    await prisma.shipmentNode.create({
      data: {
        shipmentId: shipment.id,
        nodeCode: node.nodeCode,
        nodeName: node.nodeName,
        location: '上海港',
        eventTime: node.eventTime,
        source: '4portun',
      },
    });
  }
  console.log('✅ 示例货物节点创建成功');

  // 创建示例账单
  const bill = await prisma.bill.create({
    data: {
      billNo: 'BILL2024001001',
      companyId: company.id,
      orderId: order.id,
      billType: 'FREIGHT',
      amount: 15800,
      currency: 'CNY',
      status: 'ISSUED',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            itemCode: 'OCEAN_FREIGHT',
            itemName: '海运费',
            quantity: 2,
            unit: 'UNIT',
            unitPrice: 5000,
            amount: 10000,
            currency: 'CNY',
          },
          {
            itemCode: 'THC',
            itemName: '码头操作费',
            quantity: 2,
            unit: 'UNIT',
            unitPrice: 800,
            amount: 1600,
            currency: 'CNY',
          },
          {
            itemCode: 'DOC',
            itemName: '文件费',
            quantity: 1,
            unit: 'SET',
            unitPrice: 500,
            amount: 500,
            currency: 'CNY',
          },
          {
            itemCode: 'SEAL',
            itemName: '封条费',
            quantity: 2,
            unit: 'PC',
            unitPrice: 50,
            amount: 100,
            currency: 'CNY',
          },
          {
            itemCode: 'AMS',
            itemName: 'AMS申报费',
            quantity: 1,
            unit: 'SET',
            unitPrice: 300,
            amount: 300,
            currency: 'CNY',
          },
          {
            itemCode: 'ISPS',
            itemName: 'ISPS安全费',
            quantity: 2,
            unit: 'UNIT',
            unitPrice: 150,
            amount: 300,
            currency: 'CNY',
          },
          {
            itemCode: 'HANDLING',
            itemName: '操作费',
            quantity: 1,
            unit: 'SET',
            unitPrice: 3000,
            amount: 3000,
            currency: 'CNY',
          },
        ],
      },
    },
  });
  console.log('✅ 示例账单创建成功:', bill.billNo);

  console.log('\n✨ 数据库初始化完成！');
  console.log('\n默认账号:');
  console.log('  用户名: admin');
  console.log('  密码: admin123456');
  console.log('\n示例数据:');
  console.log('  企业: 示例贸易公司');
  console.log('  订单: ORD2024001001');
  console.log('  货物: MSCU1234567');
  console.log('  账单: BILL2024001001');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
