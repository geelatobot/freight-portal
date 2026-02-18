/**
 * API 端点常量定义
 * 统一存放所有前后端交互的 API 路径
 */

export const API_ENDPOINTS = {
  /**
   * 认证相关接口
   */
  AUTH: {
    /** 用户登录 POST */
    LOGIN: '/auth/login',
    /** 用户注册 POST */
    REGISTER: '/auth/register',
    /** 刷新 Token POST */
    REFRESH: '/auth/refresh',
    /** 用户登出 POST - 后端未实现 */
    LOGOUT: '/auth/logout',
    /** 获取用户资料 GET - 后端未实现，建议使用 /customers/profile */
    PROFILE: '/auth/profile',
    /** 更新用户资料 PUT - 后端未实现 */
    UPDATE_PROFILE: '/auth/profile',
    /** 获取当前用户信息 GET - Admin 使用，后端未实现 */
    ME: '/auth/me',
  },

  /**
   * 客户相关接口
   */
  CUSTOMERS: {
    /** 获取客户资料 GET */
    PROFILE: '/customers/profile',
    /** 获取企业列表 GET */
    COMPANIES: '/customers/companies',
  },

  /**
   * 订单相关接口
   */
  ORDERS: {
    /** 获取订单列表 GET */
    LIST: '/orders',
    /** 获取订单详情 GET */
    DETAIL: (id: string) => `/orders/${id}`,
    /** 创建订单 POST */
    CREATE: '/orders',
    /** 更新订单 PUT */
    UPDATE: (id: string) => `/orders/${id}`,
    /** 取消订单 DELETE - 注意：前端使用 POST /orders/${id}/cancel */
    CANCEL: (id: string) => `/orders/${id}`,
    /** 取消订单（前端当前使用）POST - 后端未实现此路径 */
    CANCEL_LEGACY: (id: string) => `/orders/${id}/cancel`,
    /** 获取订单时间线 GET - 后端未实现 */
    TIMELINE: (id: string) => `/orders/${id}/timeline`,
  },

  /**
   * 订单生命周期管理接口
   */
  ORDER_LIFECYCLE: {
    /** 获取状态变更历史 GET */
    HISTORY: (orderId: string) => `/orders/${orderId}/lifecycle/history`,
    /** 获取可用状态流转选项 GET */
    TRANSITIONS: (orderId: string) => `/orders/${orderId}/lifecycle/transitions`,
    /** 审批订单 POST */
    APPROVE: (orderId: string) => `/orders/${orderId}/lifecycle/approve`,
    /** 执行状态流转 POST */
    TRANSITION: (orderId: string) => `/orders/${orderId}/lifecycle/transition`,
    /** 关联货物 POST */
    LINK_SHIPMENTS: (orderId: string) => `/orders/${orderId}/lifecycle/link-shipments`,
    /** 自动关联货物 POST */
    AUTO_LINK: (orderId: string) => `/orders/${orderId}/lifecycle/auto-link`,
    /** 解除货物关联 POST */
    UNLINK_SHIPMENTS: (orderId: string) => `/orders/${orderId}/lifecycle/unlink-shipments`,
    /** 批量确认订单 POST */
    BATCH_CONFIRM: '/orders/lifecycle/batch-confirm',
  },

  /**
   * 订单状态机接口
   */
  ORDER_STATE_MACHINE: {
    /** 获取所有状态定义 GET */
    STATUSES: '/order-state-machine/statuses',
    /** 获取所有状态流转规则 GET */
    TRANSITIONS: '/order-state-machine/transitions',
  },

  /**
   * 货物/货运相关接口
   */
  SHIPMENTS: {
    /** 获取货物列表 GET */
    LIST: '/shipments',
    /** 获取货物详情 GET */
    DETAIL: (id: string) => `/shipments/${id}`,
    /** 集装箱跟踪 POST（公开接口，无需认证） */
    TRACK: '/shipments/track',
    /** 根据提单号查询 GET（公开接口） */
    TRACK_BY_BL: '/shipments/track/bl',
    /** 同步货物状态 POST - 后端未实现 */
    SYNC: (id: string) => `/shipments/${id}/sync`,
    /** 获取货物节点 GET - 后端未实现 */
    NODES: (id: string) => `/shipments/${id}/nodes`,
  },

  /**
   * 货物跟踪相关接口（前端旧版）
   * 注意：后端未实现 /tracking/* 路径，建议使用 /shipments/track
   */
  TRACKING: {
    /** 获取货物状态 GET - 后端未实现 */
    CARGO_STATUS: (containerNumber: string) => `/tracking/${containerNumber}`,
    /** 批量查询 POST - 后端未实现 */
    BATCH: '/tracking/batch',
    /** 获取跟踪历史 GET - 后端未实现 */
    HISTORY: (containerNumber: string) => `/tracking/${containerNumber}/history`,
    /** 订阅跟踪 POST - 后端未实现 */
    SUBSCRIBE: (containerNumber: string) => `/tracking/${containerNumber}/subscribe`,
    /** 取消订阅 DELETE - 后端未实现 */
    UNSUBSCRIBE: (containerNumber: string) => `/tracking/${containerNumber}/subscribe`,
    /** 获取订阅列表 GET - 后端未实现 */
    SUBSCRIPTIONS: '/tracking/subscriptions',
  },

  /**
   * 账单/财务相关接口
   */
  BILLING: {
    /** 获取账单列表 GET */
    BILLS: '/billing/bills',
    /** 获取账单详情 GET */
    BILL_DETAIL: (id: string) => `/billing/bills/${id}`,
    /** 创建账单 POST */
    CREATE_BILL: '/billing/bills',
    /** 确认收款 PUT */
    CONFIRM_PAYMENT: (id: string) => `/billing/bills/${id}/payment`,
    /** 获取账单统计 GET */
    STATS: '/billing/stats',
  },

  /**
   * 账单生命周期管理接口
   */
  BILL_LIFECYCLE: {
    /** 基于订单生成账单 POST */
    GENERATE_FROM_ORDER: '/bills/generate-from-order',
    /** 基于货物生成账单 POST */
    GENERATE_FROM_SHIPMENT: '/bills/generate-from-shipment',
    /** 账单状态流转 POST */
    TRANSITION: (id: string) => `/bills/${id}/transition`,
    /** 开具账单 POST */
    ISSUE: (id: string) => `/bills/${id}/issue`,
    /** 取消账单 POST */
    CANCEL: (id: string) => `/bills/${id}/cancel`,
    /** 确认收款 POST */
    PAYMENT: (id: string) => `/bills/${id}/payment`,
    /** 获取账单状态历史 GET */
    HISTORY: (id: string) => `/bills/${id}/history`,
    /** 添加账单明细 POST */
    ADD_ITEM: (id: string) => `/bills/${id}/items`,
    /** 更新账单明细 PUT */
    UPDATE_ITEM: (id: string, itemId: string) => `/bills/${id}/items/${itemId}`,
    /** 删除账单明细 DELETE */
    DELETE_ITEM: (id: string, itemId: string) => `/bills/${id}/items/${itemId}`,
    /** 批量更新账单明细 PUT */
    BATCH_UPDATE_ITEMS: (id: string) => `/bills/${id}/items`,
    /** 获取所有账单状态定义 GET */
    STATUSES: '/bills/metadata/statuses',
    /** 获取所有账单类型定义 GET */
    TYPES: '/bills/metadata/types',
  },

  /**
   * 通知相关接口
   * 注意：后端未实现 /notifications/* 路径
   */
  NOTIFICATIONS: {
    /** 获取通知列表 GET - 后端未实现 */
    LIST: '/notifications',
    /** 标记已读 PUT - 后端未实现 */
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    /** 标记全部已读 PUT - 后端未实现 */
    MARK_ALL_READ: '/notifications/read-all',
    /** 获取未读数量 GET - 后端未实现 */
    UNREAD_COUNT: '/notifications/unread-count',
  },

  /**
   * AI 相关接口
   */
  AI: {
    /** AI 聊天 POST */
    CHAT: '/ai/chat',
    /** 查询货物状态 POST */
    QUERY_SHIPMENT: '/ai/query-shipment',
  },

  /**
   * 管理后台接口
   */
  ADMIN: {
    /** 获取仪表盘统计数据 GET */
    DASHBOARD: '/admin/dashboard',
    
    /** 企业管理 */
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
    
    /** 订单管理 */
    ORDERS: {
      /** 获取所有订单 GET */
      LIST: '/admin/orders',
      /** 更新订单状态 PUT */
      UPDATE_STATUS: (id: string) => `/admin/orders/${id}/status`,
      /** 导出订单 GET - 后端未实现 */
      EXPORT: '/admin/orders/export',
    },
    
    /** 财务管理 */
    BILLS: {
      /** 获取所有账单 GET */
      LIST: '/admin/bills',
      /** 确认收款 PUT */
      CONFIRM_PAYMENT: (id: string) => `/admin/bills/${id}/payment`,
    },
  },
} as const;

/**
 * 后端未实现的接口列表（需要后端补充实现）
 */
export const MISSING_BACKEND_ENDPOINTS = [
  // Web 前端需要的接口
  { path: '/auth/logout', method: 'POST', description: '用户登出' },
  { path: '/auth/profile', method: 'GET', description: '获取用户资料' },
  { path: '/auth/profile', method: 'PUT', description: '更新用户资料' },
  { path: '/tracking/:containerNumber', method: 'GET', description: '获取货物跟踪状态' },
  { path: '/tracking/batch', method: 'POST', description: '批量查询货物跟踪' },
  { path: '/tracking/:containerNumber/history', method: 'GET', description: '获取跟踪历史' },
  { path: '/tracking/:containerNumber/subscribe', method: 'POST', description: '订阅跟踪' },
  { path: '/tracking/:containerNumber/subscribe', method: 'DELETE', description: '取消订阅跟踪' },
  { path: '/tracking/subscriptions', method: 'GET', description: '获取订阅列表' },
  { path: '/orders/:id/cancel', method: 'POST', description: '取消订单（前端当前使用）' },
  { path: '/orders/:id/timeline', method: 'GET', description: '获取订单时间线' },
  { path: '/notifications', method: 'GET', description: '获取通知列表' },
  { path: '/notifications/:id/read', method: 'PUT', description: '标记通知已读' },
  { path: '/notifications/read-all', method: 'PUT', description: '标记全部通知已读' },
  { path: '/notifications/unread-count', method: 'GET', description: '获取未读通知数量' },
  
  // Admin 前端需要的接口
  { path: '/auth/me', method: 'GET', description: '获取当前管理员信息' },
  { path: '/admin/companies/:id', method: 'GET', description: '获取企业详情' },
  { path: '/admin/companies/:id/credit', method: 'PUT', description: '更新企业信用额度' },
  { path: '/admin/companies/:id/credit-history', method: 'GET', description: '获取企业信用历史' },
  { path: '/admin/orders/export', method: 'GET', description: '导出订单' },
  { path: '/shipments/:id/sync', method: 'POST', description: '同步货物状态' },
  { path: '/shipments/:id/nodes', method: 'GET', description: '获取货物节点' },
];

/**
 * 前端未使用的后端接口列表（可能需要前端补充调用）
 */
export const UNUSED_BACKEND_ENDPOINTS = [
  { path: '/auth/refresh', method: 'POST', description: '刷新 Token' },
  { path: '/customers/profile', method: 'GET', description: '获取客户资料' },
  { path: '/customers/companies', method: 'GET', description: '获取企业列表' },
  { path: '/shipments/track', method: 'POST', description: '集装箱跟踪（公开）' },
  { path: '/shipments/track/bl', method: 'GET', description: '根据提单号查询' },
  { path: '/billing/stats', method: 'GET', description: '账单统计' },
  { path: '/billing/bills', method: 'POST', description: '创建账单' },
  { path: '/billing/bills/:id/payment', method: 'PUT', description: '确认收款' },
  { path: '/orders/:orderId/lifecycle/*', method: 'MULTIPLE', description: '订单生命周期管理' },
  { path: '/bills/*', method: 'MULTIPLE', description: '账单生命周期管理' },
  { path: '/ai/chat', method: 'POST', description: 'AI 聊天' },
  { path: '/ai/query-shipment', method: 'POST', description: 'AI 查询货物' },
];
