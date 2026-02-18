import { Injectable } from '@nestjs/common';
import { PrismaClient, BillStatus, BillType } from '@prisma/client';

export interface BillItemInput {
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency?: string;
  remark?: string;
}

export interface GenerateBillFromOrderDto {
  orderId: string;
  companyId: string;
  billType: BillType;
  items: BillItemInput[];
  dueDays?: number; // 账期天数，默认30天
  remark?: string;
}

export interface GenerateBillFromShipmentDto {
  shipmentId: string;
  companyId: string;
  billType: BillType;
  items: BillItemInput[];
  dueDays?: number;
  remark?: string;
}

export interface UpdateBillItemDto {
  id?: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  remark?: string;
}

@Injectable()
export class BillLifecycleService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 生成账单号
   * 规则: BILL + 年月日(8位) + 4位随机数
   */
  private generateBillNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BILL${year}${month}${day}${random}`;
  }

  /**
   * 计算账单明细总金额
   */
  private calculateTotalAmount(items: BillItemInput[]): number {
    return items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  }

  /**
   * 计算到期日
   */
  private calculateDueDate(days: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * 基于订单生成账单
   */
  async generateFromOrder(dto: GenerateBillFromOrderDto) {
    // 验证订单存在
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        companyId: dto.companyId,
      },
    });

    if (!order) {
      throw new Error('订单不存在或不属于当前企业');
    }

    const billNo = this.generateBillNo();
    const totalAmount = this.calculateTotalAmount(dto.items);
    const dueDate = this.calculateDueDate(dto.dueDays);

    const bill = await this.prisma.bill.create({
      data: {
        billNo,
        companyId: dto.companyId,
        orderId: dto.orderId,
        billType: dto.billType,
        status: BillStatus.DRAFT,
        amount: totalAmount,
        currency: dto.items[0]?.currency || 'CNY',
        dueDate,
        remark: dto.remark,
        items: {
          create: dto.items.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            currency: item.currency || 'CNY',
            remark: item.remark,
          })),
        },
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
          },
        },
        items: true,
      },
    });

    return bill;
  }

  /**
   * 基于货物生成账单
   */
  async generateFromShipment(dto: GenerateBillFromShipmentDto) {
    // 验证货物存在
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: dto.shipmentId,
        companyId: dto.companyId,
      },
    });

    if (!shipment) {
      throw new Error('货物不存在或不属于当前企业');
    }

    const billNo = this.generateBillNo();
    const totalAmount = this.calculateTotalAmount(dto.items);
    const dueDate = this.calculateDueDate(dto.dueDays);

    const bill = await this.prisma.bill.create({
      data: {
        billNo,
        companyId: dto.companyId,
        orderId: shipment.orderId,
        billType: dto.billType,
        status: BillStatus.DRAFT,
        amount: totalAmount,
        currency: dto.items[0]?.currency || 'CNY',
        dueDate,
        remark: dto.remark,
        items: {
          create: dto.items.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            currency: item.currency || 'CNY',
            remark: item.remark,
          })),
        },
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
          },
        },
        items: true,
      },
    });

    return bill;
  }

  /**
   * 账单状态流转
   * DRAFT → ISSUED → PARTIAL_PAID/PAID
   */
  async transitionStatus(
    billId: string,
    targetStatus: BillStatus,
    operatorId: string,
    reason?: string,
  ) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('账单不存在');
    }

    // 验证状态流转
    const validTransitions = this.getValidTransitions(bill.status);
    if (!validTransitions.includes(targetStatus)) {
      throw new Error(`不能从 ${bill.status} 流转到 ${targetStatus}`);
    }

    const updateData: any = { status: targetStatus };

    // 开具账单时设置开具日期
    if (targetStatus === BillStatus.ISSUED && bill.status === BillStatus.DRAFT) {
      updateData.issueDate = new Date();
    }

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
          },
        },
        items: true,
      },
    });

    // 记录状态变更历史
    await this.recordStatusHistory(billId, bill.status, targetStatus, operatorId, reason);

    return updated;
  }

  /**
   * 获取有效的状态流转
   */
  private getValidTransitions(currentStatus: BillStatus): BillStatus[] {
    const transitions: Record<BillStatus, BillStatus[]> = {
      [BillStatus.DRAFT]: [BillStatus.ISSUED, BillStatus.CANCELLED],
      [BillStatus.ISSUED]: [BillStatus.PARTIAL_PAID, BillStatus.PAID, BillStatus.OVERDUE, BillStatus.CANCELLED],
      [BillStatus.PARTIAL_PAID]: [BillStatus.PAID, BillStatus.OVERDUE],
      [BillStatus.PAID]: [],
      [BillStatus.OVERDUE]: [BillStatus.PAID, BillStatus.PARTIAL_PAID],
      [BillStatus.CANCELLED]: [],
    };
    return transitions[currentStatus] || [];
  }

  /**
   * 记录账单状态历史
   */
  private async recordStatusHistory(
    billId: string,
    fromStatus: BillStatus,
    toStatus: BillStatus,
    operatorId: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO bill_status_history (id, bill_id, from_status, to_status, reason, operator_id, created_at)
      VALUES (UUID(), ${billId}, ${fromStatus}, ${toStatus}, ${reason}, ${operatorId}, NOW())
    `;
  }

  /**
   * 获取账单状态历史
   */
  async getStatusHistory(billId: string) {
    const history = await this.prisma.$queryRaw`
      SELECT 
        h.id,
        h.bill_id as billId,
        h.from_status as fromStatus,
        h.to_status as toStatus,
        h.reason,
        h.operator_id as operatorId,
        u.real_name as operatorName,
        h.created_at as createdAt
      FROM bill_status_history h
      LEFT JOIN users u ON h.operator_id = u.id
      WHERE h.bill_id = ${billId}
      ORDER BY h.created_at DESC
    `;
    return history;
  }

  /**
   * 账单明细 CRUD
   */

  /**
   * 添加账单明细
   */
  async addBillItem(billId: string, item: BillItemInput, operatorId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('账单不存在');
    }

    // 只有草稿状态的账单可以修改明细
    if (bill.status !== BillStatus.DRAFT) {
      throw new Error('只有草稿状态的账单可以修改明细');
    }

    const newItem = await this.prisma.billItem.create({
      data: {
        billId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
        currency: item.currency || 'CNY',
        remark: item.remark,
      },
    });

    // 重新计算账单总金额
    await this.recalculateBillAmount(billId);

    return newItem;
  }

  /**
   * 更新账单明细
   */
  async updateBillItem(billId: string, itemId: string, item: UpdateBillItemDto, operatorId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('账单不存在');
    }

    if (bill.status !== BillStatus.DRAFT) {
      throw new Error('只有草稿状态的账单可以修改明细');
    }

    const updated = await this.prisma.billItem.update({
      where: { id: itemId },
      data: {
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
        remark: item.remark,
      },
    });

    // 重新计算账单总金额
    await this.recalculateBillAmount(billId);

    return updated;
  }

  /**
   * 删除账单明细
   */
  async deleteBillItem(billId: string, itemId: string, operatorId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('账单不存在');
    }

    if (bill.status !== BillStatus.DRAFT) {
      throw new Error('只有草稿状态的账单可以删除明细');
    }

    await this.prisma.billItem.delete({
      where: { id: itemId },
    });

    // 重新计算账单总金额
    await this.recalculateBillAmount(billId);

    return { success: true };
  }

  /**
   * 重新计算账单总金额
   */
  private async recalculateBillAmount(billId: string) {
    const items = await this.prisma.billItem.findMany({
      where: { billId },
    });

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);

    await this.prisma.bill.update({
      where: { id: billId },
      data: { amount: totalAmount },
    });
  }

  /**
   * 批量更新账单明细
   */
  async batchUpdateItems(billId: string, items: UpdateBillItemDto[], operatorId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('账单不存在');
    }

    if (bill.status !== BillStatus.DRAFT) {
      throw new Error('只有草稿状态的账单可以修改明细');
    }

    // 删除现有明细
    await this.prisma.billItem.deleteMany({
      where: { billId },
    });

    // 创建新明细
    await this.prisma.billItem.createMany({
      data: items.map(item => ({
        billId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
        currency: 'CNY',
        remark: item.remark,
      })),
    });

    // 重新计算总金额
    await this.recalculateBillAmount(billId);

    return this.prisma.bill.findUnique({
      where: { id: billId },
      include: { items: true },
    });
  }

  /**
   * 确认收款并更新状态
   */
  async confirmPayment(
    billId: string,
    paidAmount: number,
    operatorId: string,
    remark?: string,
  ) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('账单不存在');
    }

    const currentPaidAmount = Number(bill.paidAmount || 0) + paidAmount;
    const totalAmount = Number(bill.amount);

    let newStatus: BillStatus;
    if (currentPaidAmount >= totalAmount) {
      newStatus = BillStatus.PAID;
    } else {
      newStatus = BillStatus.PARTIAL_PAID;
    }

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        paidAmount: currentPaidAmount,
        status: newStatus,
        paidDate: newStatus === BillStatus.PAID ? new Date() : bill.paidDate,
        remark: remark ? `${bill.remark || ''}\n${remark}` : bill.remark,
      },
      include: {
        items: true,
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    // 记录状态变更
    if (bill.status !== newStatus) {
      await this.recordStatusHistory(billId, bill.status, newStatus, operatorId, remark);
    }

    return updated;
  }

  /**
   * 获取账单状态标签
   */
  getStatusLabel(status: BillStatus): string {
    const labels: Record<BillStatus, string> = {
      [BillStatus.DRAFT]: '草稿',
      [BillStatus.ISSUED]: '已开具',
      [BillStatus.PARTIAL_PAID]: '部分支付',
      [BillStatus.PAID]: '已支付',
      [BillStatus.OVERDUE]: '逾期',
      [BillStatus.CANCELLED]: '已取消',
    };
    return labels[status] || status;
  }

  /**
   * 获取账单类型标签
   */
  getBillTypeLabel(type: BillType): string {
    const labels: Record<BillType, string> = {
      [BillType.FREIGHT]: '运费',
      [BillType.AGENCY]: '代理费',
      [BillType.CUSTOMS]: '报关费',
      [BillType.INSURANCE]: '保险费',
      [BillType.OTHER]: '其他',
    };
    return labels[type] || type;
  }
}
