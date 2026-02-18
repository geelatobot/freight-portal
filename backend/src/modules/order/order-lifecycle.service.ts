import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaClient, OrderStatus, Prisma } from '@prisma/client';
import { OrderStateMachine } from './order-state.machine';

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason?: string;
  operatorId: string;
  operatorName?: string;
  createdAt: Date;
}

export interface ApproveOrderDto {
  approved: boolean;
  reason?: string;
  remark?: string;
}

@Injectable()
export class OrderLifecycleService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 状态变更历史记录
   */
  async recordStatusHistory(
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    operatorId: string,
    reason?: string,
    remark?: string,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO order_status_history (id, order_id, from_status, to_status, reason, remark, operator_id, created_at)
      VALUES (UUID(), ${orderId}, ${fromStatus}, ${toStatus}, ${reason}, ${remark}, ${operatorId}, NOW())
    `;
  }

  /**
   * 获取订单状态变更历史
   */
  async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    const history = await this.prisma.$queryRaw<OrderStatusHistory[]>`
      SELECT 
        h.id,
        h.order_id as orderId,
        h.from_status as fromStatus,
        h.to_status as toStatus,
        h.reason,
        h.operator_id as operatorId,
        u.real_name as operatorName,
        h.created_at as createdAt
      FROM order_status_history h
      LEFT JOIN users u ON h.operator_id = u.id
      WHERE h.order_id = ${orderId}
      ORDER BY h.created_at DESC
    `;
    return history;
  }

  /**
   * 执行状态流转
   */
  async transitionStatus(
    orderId: string,
    targetStatus: OrderStatus,
    operatorId: string,
    reason?: string,
    remark?: string,
  ) {
    // 获取当前订单
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const currentStatus = order.status;

    // 验证状态流转
    const validation = OrderStateMachine.validateTransition(
      currentStatus,
      targetStatus,
      reason,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // 执行状态更新
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: targetStatus,
        subStatus: targetStatus === OrderStatus.PROCESSING ? 'IN_PROGRESS' : null,
        internalRemark: remark || order.internalRemark,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
      },
    });

    // 记录状态变更历史
    await this.recordStatusHistory(
      orderId,
      currentStatus,
      targetStatus,
      operatorId,
      reason,
      remark,
    );

    return {
      ...updated,
      transition: {
        from: currentStatus,
        to: targetStatus,
        description: OrderStateMachine.getTransitionDescription(currentStatus, targetStatus),
      },
    };
  }

  /**
   * 企业管理员审批订单
   */
  async approveOrder(
    orderId: string,
    approverId: string,
    approveDto: ApproveOrderDto,
  ) {
    // 获取订单信息
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        company: {
          include: {
            companyUsers: {
              where: { userId: approverId },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 验证审批人权限
    const companyUser = order.company.companyUsers[0];
    if (!companyUser) {
      throw new ForbiddenException('无权操作此订单');
    }

    // 只有管理员可以审批
    const adminRoles = ['ADMIN'];
    if (!adminRoles.includes(companyUser.role)) {
      throw new ForbiddenException('只有企业管理员可以审批订单');
    }

    // 只能审批待确认状态的订单
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`当前订单状态为 ${OrderStateMachine.getStatusLabel(order.status)}，不能进行审批`);
    }

    // 执行审批
    const targetStatus = approveDto.approved ? OrderStatus.CONFIRMED : OrderStatus.REJECTED;
    
    return this.transitionStatus(
      orderId,
      targetStatus,
      approverId,
      approveDto.reason,
      approveDto.remark,
    );
  }

  /**
   * 管理员直接更新订单状态
   */
  async adminUpdateStatus(
    orderId: string,
    targetStatus: OrderStatus,
    adminId: string,
    reason?: string,
    remark?: string,
  ) {
    return this.transitionStatus(orderId, targetStatus, adminId, reason, remark);
  }

  /**
   * 获取订单可用的状态流转选项
   */
  async getAvailableTransitions(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const availableStatuses = OrderStateMachine.getAvailableTransitions(order.status);
    
    return {
      currentStatus: order.status,
      currentStatusLabel: OrderStateMachine.getStatusLabel(order.status),
      availableTransitions: availableStatuses.map(status => ({
        status,
        label: OrderStateMachine.getStatusLabel(status),
        color: OrderStateMachine.getStatusColor(status),
        requiresReason: OrderStateMachine.requiresReason(order.status, status),
      })),
    };
  }

  /**
   * 批量确认订单（从PENDING到CONFIRMED）
   */
  async batchConfirm(orderIds: string[], operatorId: string, remark?: string) {
    const results = [];
    const errors = [];

    for (const orderId of orderIds) {
      try {
        const result = await this.transitionStatus(
          orderId,
          OrderStatus.CONFIRMED,
          operatorId,
          undefined,
          remark,
        );
        results.push({ orderId, success: true, data: result });
      } catch (error) {
        errors.push({ orderId, success: false, error: error.message });
      }
    }

    return {
      total: orderIds.length,
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * 订单关联货物（集装箱）
   */
  async linkShipments(orderId: string, shipmentIds: string[], operatorId: string) {
    // 验证订单存在
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 验证货物存在且属于同一企业
    const shipments = await this.prisma.shipment.findMany({
      where: {
        id: { in: shipmentIds },
        companyId: order.companyId,
      },
    });

    if (shipments.length !== shipmentIds.length) {
      throw new BadRequestException('部分货物不存在或不属于当前企业');
    }

    // 更新货物关联
    await this.prisma.shipment.updateMany({
      where: {
        id: { in: shipmentIds },
      },
      data: {
        orderId,
      },
    });

    // 同步订单集装箱信息
    const containerNos = shipments.map(s => s.containerNo).filter(Boolean);
    const containerTypes = [...new Set(shipments.map(s => s.containerType).filter(Boolean))];
    
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        containerCount: shipmentIds.length,
        containerType: containerTypes.join(', '),
      },
    });

    // 记录操作日志
    await this.recordStatusHistory(
      orderId,
      null,
      order.status,
      operatorId,
      `关联货物: ${containerNos.join(', ')}`,
    );

    return {
      orderId,
      linkedShipments: shipmentIds.length,
      containerNos,
    };
  }

  /**
   * 解除订单货物关联
   */
  async unlinkShipments(orderId: string, shipmentIds: string[], operatorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 解除关联
    await this.prisma.shipment.updateMany({
      where: {
        id: { in: shipmentIds },
        orderId,
      },
      data: {
        orderId: null,
      },
    });

    // 重新计算订单集装箱数量
    const remainingShipments = await this.prisma.shipment.count({
      where: { orderId },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        containerCount: remainingShipments > 0 ? remainingShipments : null,
      },
    });

    return {
      orderId,
      unlinkedShipments: shipmentIds.length,
      remainingShipments,
    };
  }

  /**
   * 获取订单时间线
   */
  async getTimeline(orderId: string): Promise<OrderStatusHistory[]> {
    const timeline = await this.prisma.$queryRaw<OrderStatusHistory[]>`
      SELECT 
        h.id,
        h.order_id as orderId,
        h.from_status as fromStatus,
        h.to_status as toStatus,
        h.reason,
        h.remark,
        h.operator_id as operatorId,
        u.real_name as operatorName,
        h.created_at as createdAt
      FROM order_status_history h
      LEFT JOIN users u ON h.operator_id = u.id
      WHERE h.order_id = ${orderId}
      ORDER BY h.created_at ASC
    `;
    return timeline;
  }

  /**
   * 创建订单时自动关联集装箱
   */
  async autoLinkShipmentsByContainerNos(
    orderId: string,
    containerNos: string[],
    operatorId: string,
  ) {
    // 获取订单信息
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 查找匹配的集装箱
    const shipments = await this.prisma.shipment.findMany({
      where: {
        containerNo: { in: containerNos },
        companyId: order.companyId,
        orderId: null, // 未关联的集装箱
      },
    });

    if (shipments.length === 0) {
      return {
        orderId,
        matched: 0,
        message: '未找到匹配的未关联集装箱',
      };
    }

    const shipmentIds = shipments.map(s => s.id);
    
    // 执行关联
    return this.linkShipments(orderId, shipmentIds, operatorId);
  }
}
