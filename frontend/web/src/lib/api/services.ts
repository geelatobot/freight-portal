import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

// 认证相关 API
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password }),
  
  register: (data: {
    email: string;
    password: string;
    companyName: string;
    contactName: string;
    phone: string;
  }) => apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data),
  
  logout: () => apiClient.post(API_ENDPOINTS.AUTH.LOGOUT),
  
  getProfile: () => apiClient.get(API_ENDPOINTS.AUTH.PROFILE),
  
  updateProfile: (data: {
    companyName?: string;
    contactName?: string;
    phone?: string;
  }) => apiClient.put(API_ENDPOINTS.AUTH.UPDATE_PROFILE, data),
  
  /** 刷新 Token */
  refreshToken: (refreshToken: string) =>
    apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken }),
};

// 客户相关 API
export const customerApi = {
  /** 获取客户资料 - 替代 /auth/profile */
  getProfile: () => apiClient.get(API_ENDPOINTS.CUSTOMERS.PROFILE),
  
  /** 获取企业列表 */
  getCompanies: () => apiClient.get(API_ENDPOINTS.CUSTOMERS.COMPANIES),
};

// 货物跟踪 API
export const trackingApi = {
  /** 
   * 获取货物状态 - 使用 /shipments/tracking 路径
   */
  getCargoStatus: (containerNumber: string) =>
    apiClient.get(`/shipments/tracking/${containerNumber}`),
  
  /** 
   * 批量查询 
   */
  batchQuery: (containerNumbers: string[]) =>
    apiClient.post('/shipments/tracking/batch', { containerNumbers }),
  
  /** 
   * 获取跟踪历史 
   */
  getTrackingHistory: (containerNumber: string) =>
    apiClient.get(`/shipments/tracking/${containerNumber}/history`),
  
  /** 
   * 订阅 
   */
  subscribe: (containerNumber: string) =>
    apiClient.post(`/shipments/tracking/${containerNumber}/subscribe`),
  
  /** 
   * 取消订阅 
   */
  unsubscribe: (containerNumber: string) =>
    apiClient.delete(`/shipments/tracking/${containerNumber}/subscribe`),
  
  /** 
   * 获取订阅列表 
   */
  getSubscriptions: () =>
    apiClient.get('/shipments/tracking/subscriptions'),
};

// 货物/货运 API
export const shipmentApi = {
  /** 获取货物列表 */
  getShipments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    companyId?: string;
  }) => apiClient.get(API_ENDPOINTS.SHIPMENTS.LIST, { params }),
  
  /** 获取货物详情 */
  getShipmentDetail: (id: string) =>
    apiClient.get(API_ENDPOINTS.SHIPMENTS.DETAIL(id)),
  
  /** 集装箱跟踪（公开接口，无需认证） */
  track: (containerNo: string, companyId?: string) =>
    apiClient.post(API_ENDPOINTS.SHIPMENTS.TRACK, { containerNo, companyId }),
  
  /** 根据提单号查询（公开接口） */
  trackByBlNo: (blNo: string) =>
    apiClient.get(API_ENDPOINTS.SHIPMENTS.TRACK_BY_BL, { params: { blNo } }),
};

// 订单 API
export const orderApi = {
  getOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get(API_ENDPOINTS.ORDERS.LIST, { params }),
  
  getOrderById: (id: string) =>
    apiClient.get(API_ENDPOINTS.ORDERS.DETAIL(id)),
  
  createOrder: (data: {
    cargoInfo: {
      containerNumber: string;
      cargoType: string;
      weight: number;
      dimensions: {
        length: number;
        width: number;
        height: number;
      };
    };
    route: {
      origin: string;
      destination: string;
      plannedDeparture: string;
      plannedArrival: string;
    };
    requirements?: string;
  }) => apiClient.post(API_ENDPOINTS.ORDERS.CREATE, data),
  
  updateOrder: (id: string, data: any) =>
    apiClient.put(API_ENDPOINTS.ORDERS.UPDATE(id), data),
  
  /**
   * 取消订单 - 使用 DELETE 方法
   */
  cancelOrder: (id: string) => apiClient.delete(API_ENDPOINTS.ORDERS.CANCEL(id)),
  
  /** 
   * 获取订单时间线 
   * @deprecated 后端未实现此接口
   */
  getOrderTimeline: (id: string) =>
    apiClient.get(API_ENDPOINTS.ORDERS.TIMELINE(id)),
};

// 订单生命周期管理 API
export const orderLifecycleApi = {
  /** 获取订单状态变更历史 */
  getStatusHistory: (orderId: string) =>
    apiClient.get(API_ENDPOINTS.ORDER_LIFECYCLE.HISTORY(orderId)),
  
  /** 获取可用的状态流转选项 */
  getAvailableTransitions: (orderId: string) =>
    apiClient.get(API_ENDPOINTS.ORDER_LIFECYCLE.TRANSITIONS(orderId)),
  
  /** 审批订单 */
  approveOrder: (orderId: string, data: { approved: boolean; remark?: string }) =>
    apiClient.post(API_ENDPOINTS.ORDER_LIFECYCLE.APPROVE(orderId), data),
  
  /** 执行状态流转 */
  transitionStatus: (
    orderId: string,
    data: { status: string; reason?: string; remark?: string }
  ) => apiClient.post(API_ENDPOINTS.ORDER_LIFECYCLE.TRANSITION(orderId), data),
  
  /** 关联货物 */
  linkShipments: (orderId: string, shipmentIds: string[]) =>
    apiClient.post(API_ENDPOINTS.ORDER_LIFECYCLE.LINK_SHIPMENTS(orderId), { shipmentIds }),
  
  /** 根据集装箱号自动关联 */
  autoLinkShipments: (orderId: string, containerNos: string[]) =>
    apiClient.post(API_ENDPOINTS.ORDER_LIFECYCLE.AUTO_LINK(orderId), { containerNos }),
  
  /** 解除货物关联 */
  unlinkShipments: (orderId: string, shipmentIds: string[]) =>
    apiClient.post(API_ENDPOINTS.ORDER_LIFECYCLE.UNLINK_SHIPMENTS(orderId), { shipmentIds }),
  
  /** 批量确认订单 */
  batchConfirm: (orderIds: string[], remark?: string) =>
    apiClient.post(API_ENDPOINTS.ORDER_LIFECYCLE.BATCH_CONFIRM, { orderIds, remark }),
};

// 订单状态机 API
export const orderStateMachineApi = {
  /** 获取所有状态定义 */
  getAllStatuses: () => apiClient.get(API_ENDPOINTS.ORDER_STATE_MACHINE.STATUSES),
  
  /** 获取所有状态流转规则 */
  getAllTransitions: () => apiClient.get(API_ENDPOINTS.ORDER_STATE_MACHINE.TRANSITIONS),
};

// 账单 API
export const billingApi = {
  /** 获取账单列表 */
  getBills: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    companyId?: string;
  }) => apiClient.get(API_ENDPOINTS.BILLING.BILLS, { params }),
  
  /** 获取账单详情 */
  getBillDetail: (id: string) =>
    apiClient.get(API_ENDPOINTS.BILLING.BILL_DETAIL(id)),
  
  /** 创建账单 */
  createBill: (data: any) =>
    apiClient.post(API_ENDPOINTS.BILLING.CREATE_BILL, data),
  
  /** 确认收款 */
  confirmPayment: (id: string, paidAmount: number, remark?: string) =>
    apiClient.put(API_ENDPOINTS.BILLING.CONFIRM_PAYMENT(id), { paidAmount, remark }),
  
  /** 获取账单统计 */
  getStats: () => apiClient.get(API_ENDPOINTS.BILLING.STATS),
};

// 账单生命周期管理 API
export const billLifecycleApi = {
  /** 基于订单生成账单 */
  generateFromOrder: (data: { orderId: string; billType: string; items?: any[] }) =>
    apiClient.post(API_ENDPOINTS.BILL_LIFECYCLE.GENERATE_FROM_ORDER, data),
  
  /** 基于货物生成账单 */
  generateFromShipment: (data: { shipmentId: string; billType: string; items?: any[] }) =>
    apiClient.post(API_ENDPOINTS.BILL_LIFECYCLE.GENERATE_FROM_SHIPMENT, data),
  
  /** 账单状态流转 */
  transitionStatus: (id: string, status: string, reason?: string) =>
    apiClient.post(API_ENDPOINTS.BILL_LIFECYCLE.TRANSITION(id), { status, reason }),
  
  /** 开具账单 */
  issueBill: (id: string, reason?: string) =>
    apiClient.post(API_ENDPOINTS.BILL_LIFECYCLE.ISSUE(id), { reason }),
  
  /** 取消账单 */
  cancelBill: (id: string, reason?: string) =>
    apiClient.post(API_ENDPOINTS.BILL_LIFECYCLE.CANCEL(id), { reason }),
  
  /** 确认收款 */
  confirmPayment: (id: string, paidAmount: number, remark?: string) =>
    apiClient.post(API_ENDPOINTS.BILL_LIFECYCLE.PAYMENT(id), { paidAmount, remark }),
  
  /** 获取账单状态历史 */
  getStatusHistory: (id: string) =>
    apiClient.get(API_ENDPOINTS.BILL_LIFECYCLE.HISTORY(id)),
  
  /** 添加账单明细 */
  addBillItem: (
    id: string,
    item: {
      itemCode: string;
      itemName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      remark?: string;
    }
  ) => apiClient.post(API_ENDPOINTS.BILL_LIFECYCLE.ADD_ITEM(id), item),
  
  /** 更新账单明细 */
  updateBillItem: (id: string, itemId: string, item: any) =>
    apiClient.put(API_ENDPOINTS.BILL_LIFECYCLE.UPDATE_ITEM(id, itemId), item),
  
  /** 删除账单明细 */
  deleteBillItem: (id: string, itemId: string) =>
    apiClient.delete(API_ENDPOINTS.BILL_LIFECYCLE.DELETE_ITEM(id, itemId)),
  
  /** 批量更新账单明细 */
  batchUpdateItems: (id: string, items: any[]) =>
    apiClient.put(API_ENDPOINTS.BILL_LIFECYCLE.BATCH_UPDATE_ITEMS(id), { items }),
  
  /** 获取所有账单状态定义 */
  getAllStatuses: () => apiClient.get(API_ENDPOINTS.BILL_LIFECYCLE.STATUSES),
  
  /** 获取所有账单类型定义 */
  getAllTypes: () => apiClient.get(API_ENDPOINTS.BILL_LIFECYCLE.TYPES),
};

// 通知 API
export const notificationApi = {
  getNotifications: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, { params }),
  
  markAsRead: (id: string) => apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),
  
  markAllAsRead: () => apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ),
  
  getUnreadCount: () => apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT),
};

// AI 相关 API
export const aiApi = {
  /** AI 聊天 */
  chat: (message: string, companyId?: string) =>
    apiClient.post(API_ENDPOINTS.AI.CHAT, { message, companyId }),
  
  /** 查询货物状态 */
  queryShipment: (containerNo: string) =>
    apiClient.post(API_ENDPOINTS.AI.QUERY_SHIPMENT, { containerNo }),
};

// 管理后台 API
export const adminApi = {
  /** 获取仪表盘统计数据 */
  getDashboard: () => apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD),
  
  // 企业管理
  companies: {
    getList: (params?: { page?: number; pageSize?: number; status?: string; keyword?: string }) => apiClient.get(API_ENDPOINTS.ADMIN.COMPANIES.LIST, { params }),
    
    getDetail: (id: string) => apiClient.get(API_ENDPOINTS.ADMIN.COMPANIES.DETAIL(id)),
    
    updateStatus: (id: string, status: string) => apiClient.put(API_ENDPOINTS.ADMIN.COMPANIES.UPDATE_STATUS(id), { status }),
    
    updateCredit: (id: string, creditLimit: number) => apiClient.put(API_ENDPOINTS.ADMIN.COMPANIES.UPDATE_CREDIT(id), { creditLimit }),
    
    getCreditHistory: (id: string, params?: any) => apiClient.get(API_ENDPOINTS.ADMIN.COMPANIES.CREDIT_HISTORY(id), { params }),
  },
  
  // 订单管理
  orders: {
    getList: (params?: any) => apiClient.get(API_ENDPOINTS.ADMIN.ORDERS.LIST, { params }),
    
    updateStatus: (id: string, status: string, remark?: string) => apiClient.put(API_ENDPOINTS.ADMIN.ORDERS.UPDATE_STATUS(id), { status, remark }),
    
    exportOrders: (params?: any) => apiClient.get(API_ENDPOINTS.ADMIN.ORDERS.EXPORT, { params, responseType: 'blob' }),
  },
  
  // 财务管理
  bills: {
    getList: (params?: any) => apiClient.get(API_ENDPOINTS.ADMIN.BILLS.LIST, { params }),
    
    confirmPayment: (id: string, paidAmount: number, remark?: string) => apiClient.put(API_ENDPOINTS.ADMIN.BILLS.CONFIRM_PAYMENT(id), { paidAmount, remark }),
  },
};

// 重新导出 API_ENDPOINTS 以便外部使用
export { API_ENDPOINTS } from './endpoints';
