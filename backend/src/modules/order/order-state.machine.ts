import { OrderStatus } from '@prisma/client';

/**
 * 订单状态机配置
 * 定义状态流转规则和校验逻辑
 */

// 状态流转图: PENDING → CONFIRMED → PROCESSING → COMPLETED
// 特殊流转: PENDING → CANCELLED, PENDING → REJECTED, CONFIRMED → CANCELLED

export interface StateTransition {
  from: OrderStatus;
  to: OrderStatus;
  allowed: boolean;
  description: string;
  requiresReason?: boolean;
}

/**
 * 订单状态流转规则定义
 */
export const ORDER_STATE_TRANSITIONS: StateTransition[] = [
  // PENDING 状态可流转到
  { from: OrderStatus.PENDING, to: OrderStatus.CONFIRMED, allowed: true, description: '确认订单' },
  { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED, allowed: true, description: '取消订单' },
  { from: OrderStatus.PENDING, to: OrderStatus.REJECTED, allowed: true, description: '拒绝订单', requiresReason: true },
  
  // CONFIRMED 状态可流转到
  { from: OrderStatus.CONFIRMED, to: OrderStatus.PROCESSING, allowed: true, description: '开始执行' },
  { from: OrderStatus.CONFIRMED, to: OrderStatus.CANCELLED, allowed: true, description: '取消订单' },
  
  // PROCESSING 状态可流转到
  { from: OrderStatus.PROCESSING, to: OrderStatus.COMPLETED, allowed: true, description: '完成订单' },
  { from: OrderStatus.PROCESSING, to: OrderStatus.CANCELLED, allowed: false, description: '执行中订单不能取消' },
  
  // 终态
  { from: OrderStatus.COMPLETED, to: OrderStatus.PENDING, allowed: false, description: '已完成订单不能修改' },
  { from: OrderStatus.CANCELLED, to: OrderStatus.PENDING, allowed: false, description: '已取消订单不能恢复' },
  { from: OrderStatus.REJECTED, to: OrderStatus.PENDING, allowed: false, description: '已拒绝订单不能恢复' },
];

/**
 * 订单状态机类
 */
export class OrderStateMachine {
  /**
   * 检查状态流转是否允许
   */
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) return true;
    
    const transition = ORDER_STATE_TRANSITIONS.find(
      t => t.from === from && t.to === to
    );
    
    return transition?.allowed ?? false;
  }

  /**
   * 获取状态流转描述
   */
  static getTransitionDescription(from: OrderStatus, to: OrderStatus): string {
    const transition = ORDER_STATE_TRANSITIONS.find(
      t => t.from === from && t.to === to
    );
    return transition?.description || '未知流转';
  }

  /**
   * 检查是否需要拒绝原因
   */
  static requiresReason(from: OrderStatus, to: OrderStatus): boolean {
    const transition = ORDER_STATE_TRANSITIONS.find(
      t => t.from === from && t.to === to
    );
    return transition?.requiresReason ?? false;
  }

  /**
   * 获取从当前状态可流转的所有状态
   */
  static getAvailableTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return ORDER_STATE_TRANSITIONS
      .filter(t => t.from === currentStatus && t.allowed)
      .map(t => t.to);
  }

  /**
   * 验证状态流转并返回错误信息
   */
  static validateTransition(from: OrderStatus, to: OrderStatus, reason?: string): { valid: boolean; error?: string } {
    if (from === to) {
      return { valid: true };
    }

    if (!this.canTransition(from, to)) {
      return { 
        valid: false, 
        error: `不能从 ${this.getStatusLabel(from)} 流转到 ${this.getStatusLabel(to)}` 
      };
    }

    if (this.requiresReason(from, to) && !reason) {
      return { 
        valid: false, 
        error: '状态流转需要提供原因' 
      };
    }

    return { valid: true };
  }

  /**
   * 获取状态中文标签
   */
  static getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: '待确认',
      [OrderStatus.CONFIRMED]: '已确认',
      [OrderStatus.PROCESSING]: '执行中',
      [OrderStatus.COMPLETED]: '已完成',
      [OrderStatus.CANCELLED]: '已取消',
      [OrderStatus.REJECTED]: '已拒绝',
    };
    return labels[status] || status;
  }

  /**
   * 获取状态颜色
   */
  static getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'warning',
      [OrderStatus.CONFIRMED]: 'info',
      [OrderStatus.PROCESSING]: 'primary',
      [OrderStatus.COMPLETED]: 'success',
      [OrderStatus.CANCELLED]: 'default',
      [OrderStatus.REJECTED]: 'danger',
    };
    return colors[status] || 'default';
  }
}
