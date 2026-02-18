import api from './api'
import { ADMIN_API_ENDPOINTS } from './endpoints'

// 认证相关
export const authApi = {
  login: (username: string, password: string) =>
    api.post(ADMIN_API_ENDPOINTS.AUTH.LOGIN, { username, password }),
  
  refreshToken: (refreshToken: string) =>
    api.post(ADMIN_API_ENDPOINTS.AUTH.REFRESH, { refreshToken }),
  
  /** 
   * 获取当前用户信息
   * @deprecated 后端未实现 /auth/me 接口
   */
  getCurrentUser: () => api.get(ADMIN_API_ENDPOINTS.AUTH.ME),
}

// 仪表盘
export const dashboardApi = {
  getStats: () => api.get(ADMIN_API_ENDPOINTS.DASHBOARD.STATS),
}

// 企业管理
export const companyApi = {
  getList: (params: { page?: number; pageSize?: number; status?: string; keyword?: string }) => api.get(ADMIN_API_ENDPOINTS.COMPANIES.LIST, { params }),
  
  /** 
   * 获取企业详情
   * @deprecated 后端未实现此接口
   */
  getDetail: (id: string) => api.get(ADMIN_API_ENDPOINTS.COMPANIES.DETAIL(id)),
  
  updateStatus: (id: string, status: string) =>
    api.put(ADMIN_API_ENDPOINTS.COMPANIES.UPDATE_STATUS(id), { status }),
  
  /** 
   * 更新企业信用额度
   * @deprecated 后端未实现此接口
   */
  updateCredit: (id: string, creditLimit: number) =>
    api.put(ADMIN_API_ENDPOINTS.COMPANIES.UPDATE_CREDIT(id), { creditLimit }),
  
  /** 
   * 获取信用历史
   * @deprecated 后端未实现此接口
   */
  getCreditHistory: (id: string, params?: any) => api.get(ADMIN_API_ENDPOINTS.COMPANIES.CREDIT_HISTORY(id), { params }),
}

// 订单管理
export const orderApi = {
  getList: (params: { page?: number; pageSize?: number; status?: string; type?: string; keyword?: string }) => api.get(ADMIN_API_ENDPOINTS.ORDERS.LIST, { params }),
  
  getDetail: (id: string) => api.get(ADMIN_API_ENDPOINTS.ORDERS.DETAIL(id)),
  
  updateStatus: (id: string, status: string, remark?: string) =>
    api.put(ADMIN_API_ENDPOINTS.ORDERS.UPDATE_STATUS(id), { status, remark }),
  
  /** 
   * 导出订单
   * @deprecated 后端未实现此接口
   */
  exportOrders: (params: any) => api.get(ADMIN_API_ENDPOINTS.ORDERS.EXPORT, { params, responseType: 'blob' }),
}

// 货物管理
export const shipmentApi = {
  getList: (params: { page?: number; pageSize?: number; status?: string; keyword?: string }) => api.get(ADMIN_API_ENDPOINTS.SHIPMENTS.LIST, { params }),
  
  getDetail: (id: string) => api.get(ADMIN_API_ENDPOINTS.SHIPMENTS.DETAIL(id)),
  
  /** 
   * 同步货物状态
   * @deprecated 后端未实现此接口
   */
  syncStatus: (id: string) => api.post(ADMIN_API_ENDPOINTS.SHIPMENTS.SYNC(id)),
  
  /** 
   * 获取货物节点
   * @deprecated 后端未实现此接口
   */
  getNodes: (id: string) => api.get(ADMIN_API_ENDPOINTS.SHIPMENTS.NODES(id)),
}

// 财务管理
export const financeApi = {
  getBills: (params: { page?: number; pageSize?: number; status?: string; type?: string; keyword?: string }) => api.get(ADMIN_API_ENDPOINTS.FINANCE.BILLS, { params }),
  
  confirmPayment: (id: string, paidAmount: number, remark?: string) => api.put(ADMIN_API_ENDPOINTS.FINANCE.CONFIRM_PAYMENT(id), { paidAmount, remark }),
}

// 重新导出 ADMIN_API_ENDPOINTS 以便外部使用
export { ADMIN_API_ENDPOINTS } from './endpoints';
