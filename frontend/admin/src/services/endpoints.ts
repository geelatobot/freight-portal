/**
 * Admin 前端 API 端点常量定义
 * 统一存放管理后台所有前后端交互的 API 路径
 */

export const ADMIN_API_ENDPOINTS = {
  /**
   * 认证相关接口
   */
  AUTH: {
    /** 管理员登录 POST */
    LOGIN: '/auth/login',
    /** 刷新 Token POST */
    REFRESH: '/auth/refresh',
    /** 获取当前用户信息 GET - 后端未实现 */
    ME: '/auth/me',
  },

  /**
   * 仪表盘接口
   */
  DASHBOARD: {
    /** 获取统计数据 GET */
    STATS: '/admin/dashboard',
  },

  /**
   * 企业管理接口
   */
  COMPANIES: {
    /** 获取企业列表 GET */
    LIST: '/admin/companies',
    /** 获取企业详情 GET - 后端未实现 */
    DETAIL: (id: string) => `/admin/companies/${id}`,
    /** 更新企业状态 PUT */
    UPDATE_STATUS: (id: string) => `/admin/companies/${id}/status`,
    /** 更新企业信用额度 PUT - 后端未实现 */
    UPDATE_CREDIT: (id: string) => `/admin/companies/${id}/credit`,
    /** 获取信用历史 GET - 后端未实现 */
    CREDIT_HISTORY: (id: string) => `/admin/companies/${id}/credit-history`,
  },

  /**
   * 订单管理接口
   */
  ORDERS: {
    /** 获取所有订单 GET */
    LIST: '/admin/orders',
    /** 获取订单详情 GET - 复用普通订单接口 */
    DETAIL: (id: string) => `/orders/${id}`,
    /** 更新订单状态 PUT */
    UPDATE_STATUS: (id: string) => `/admin/orders/${id}/status`,
    /** 导出订单 GET - 后端未实现 */
    EXPORT: '/admin/orders/export',
  },

  /**
   * 货物管理接口
   */
  SHIPMENTS: {
    /** 获取货物列表 GET */
    LIST: '/shipments',
    /** 获取货物详情 GET */
    DETAIL: (id: string) => `/shipments/${id}`,
    /** 同步货物状态 POST - 后端未实现 */
    SYNC: (id: string) => `/shipments/${id}/sync`,
    /** 获取货物节点 GET - 后端未实现 */
    NODES: (id: string) => `/shipments/${id}/nodes`,
  },

  /**
   * 财务管理接口
   */
  FINANCE: {
    /** 获取所有账单 GET */
    BILLS: '/admin/bills',
    /** 确认收款 PUT */
    CONFIRM_PAYMENT: (id: string) => `/admin/bills/${id}/payment`,
  },
} as const;

/**
 * Admin 前端调用但后端未实现的接口列表
 */
export const ADMIN_MISSING_ENDPOINTS = [
  { path: '/auth/me', method: 'GET', description: '获取当前管理员信息', priority: '高' },
  { path: '/admin/companies/:id', method: 'GET', description: '获取企业详情', priority: '中' },
  { path: '/admin/companies/:id/credit', method: 'PUT', description: '更新企业信用额度', priority: '中' },
  { path: '/admin/companies/:id/credit-history', method: 'GET', description: '获取企业信用历史', priority: '低' },
  { path: '/admin/orders/export', method: 'GET', description: '导出订单', priority: '中' },
  { path: '/shipments/:id/sync', method: 'POST', description: '同步货物状态', priority: '低' },
  { path: '/shipments/:id/nodes', method: 'GET', description: '获取货物节点', priority: '低' },
];
