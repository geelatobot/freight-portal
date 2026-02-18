import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderLifecycleService, ApproveOrderDto } from './order-lifecycle.service';
import { OrderStateMachine } from './order-state.machine';
import { OrderStatus } from '@prisma/client';

@Controller('orders/:orderId/lifecycle')
export class OrderLifecycleController {
  constructor(private readonly orderLifecycleService: OrderLifecycleService) {}

  /**
   * 获取订单状态变更历史
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getStatusHistory(@Param('orderId') orderId: string) {
    return this.orderLifecycleService.getStatusHistory(orderId);
  }

  /**
   * 获取可用的状态流转选项
   */
  @Get('transitions')
  @UseGuards(JwtAuthGuard)
  async getAvailableTransitions(@Param('orderId') orderId: string) {
    return this.orderLifecycleService.getAvailableTransitions(orderId);
  }

  /**
   * 企业管理员审批订单
   */
  @Post('approve')
  @UseGuards(JwtAuthGuard)
  async approveOrder(
    @Param('orderId') orderId: string,
    @Body() approveDto: ApproveOrderDto,
    @Request() req,
  ) {
    return this.orderLifecycleService.approveOrder(orderId, req.user.id, approveDto);
  }

  /**
   * 执行状态流转
   */
  @Post('transition')
  @UseGuards(JwtAuthGuard)
  async transitionStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: OrderStatus,
    @Body('reason') reason: string,
    @Body('remark') remark: string,
    @Request() req,
  ) {
    return this.orderLifecycleService.transitionStatus(
      orderId,
      status,
      req.user.id,
      reason,
      remark,
    );
  }

  /**
   * 关联货物（集装箱）
   */
  @Post('link-shipments')
  @UseGuards(JwtAuthGuard)
  async linkShipments(
    @Param('orderId') orderId: string,
    @Body('shipmentIds') shipmentIds: string[],
    @Request() req,
  ) {
    return this.orderLifecycleService.linkShipments(orderId, shipmentIds, req.user.id);
  }

  /**
   * 根据集装箱号自动关联
   */
  @Post('auto-link')
  @UseGuards(JwtAuthGuard)
  async autoLinkShipments(
    @Param('orderId') orderId: string,
    @Body('containerNos') containerNos: string[],
    @Request() req,
  ) {
    return this.orderLifecycleService.autoLinkShipmentsByContainerNos(
      orderId,
      containerNos,
      req.user.id,
    );
  }

  /**
   * 解除货物关联
   */
  @Post('unlink-shipments')
  @UseGuards(JwtAuthGuard)
  async unlinkShipments(
    @Param('orderId') orderId: string,
    @Body('shipmentIds') shipmentIds: string[],
    @Request() req,
  ) {
    return this.orderLifecycleService.unlinkShipments(orderId, shipmentIds, req.user.id);
  }

  /**
   * 批量确认订单
   */
  @Post('batch-confirm')
  @UseGuards(JwtAuthGuard)
  async batchConfirm(
    @Body('orderIds') orderIds: string[],
    @Body('remark') remark: string,
    @Request() req,
  ) {
    return this.orderLifecycleService.batchConfirm(orderIds, req.user.id, remark);
  }

  /**
   * 获取订单时间线
   */
  @Get('timeline')
  @UseGuards(JwtAuthGuard)
  async getOrderTimeline(@Param('orderId') orderId: string) {
    return this.orderLifecycleService.getTimeline(orderId);
  }
}

/**
 * 状态机工具接口
 */
@Controller('order-state-machine')
export class OrderStateMachineController {
  /**
   * 获取所有状态定义
   */
  @Get('statuses')
  @UseGuards(JwtAuthGuard)
  getAllStatuses() {
    return Object.values(OrderStatus).map(status => ({
      value: status,
      label: OrderStateMachine.getStatusLabel(status),
      color: OrderStateMachine.getStatusColor(status),
    }));
  }

  /**
   * 获取所有状态流转规则
   */
  @Get('transitions')
  @UseGuards(JwtAuthGuard)
  getAllTransitions() {
    return {
      transitions: [
        { from: OrderStatus.PENDING, to: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.REJECTED] },
        { from: OrderStatus.CONFIRMED, to: [OrderStatus.PROCESSING, OrderStatus.CANCELLED] },
        { from: OrderStatus.PROCESSING, to: [OrderStatus.COMPLETED] },
      ],
      labels: Object.values(OrderStatus).reduce((acc, status) => {
        acc[status] = OrderStateMachine.getStatusLabel(status);
        return acc;
      }, {}),
    };
  }
}
