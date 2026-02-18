/**
 * 任务 1.2.1: FourPortunService 完整实现 - 4Portun API 配置
 */

export const FOURPORTUN_CONFIG = {
  // API 基础配置
  BASE_URL: process.env.FOURPORTUN_API_URL || 'https://prod-api.4portun.com',
  AUTH_TIMEOUT: 10000,      // 认证请求超时
  API_TIMEOUT: 30000,       // API 请求超时
  BATCH_TIMEOUT: 60000,     // 批量请求超时
  
  // Token 配置
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000,  // 提前5分钟刷新token
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000,    // token有效期24小时
  
  // 重试配置
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000,   // 基础延迟1秒
  RETRY_DELAY_MAX: 10000,   // 最大延迟10秒
  
  // 限流配置
  RATE_LIMIT_PER_MINUTE: 100,
  
  // Webhook 配置
  WEBHOOK_SECRET_HEADER: 'X-4Portun-Signature',
  WEBHOOK_TIMESTAMP_HEADER: 'X-4Portun-Timestamp',
  WEBHOOK_TOLERANCE: 5 * 60 * 1000,  // 5分钟时间窗口
};

/**
 * 4Portun API 端点
 */
export const FOURPORTUN_ENDPOINTS = {
  // 认证
  AUTH_TOKEN: '/openapi/auth/token',
  
  // 集装箱跟踪
  TRACK_CONTAINER: (containerNo: string) => `/openapi/tracking/container/${containerNo}`,
  TRACK_BL: (blNo: string) => `/openapi/tracking/bl/${blNo}`,
  TRACK_BATCH: '/openapi/tracking/containers/batch',
  
  // 海关状态
  CUSTOMS_STATUS: (containerNo: string) => `/openapi/customs/container/${containerNo}`,
  
  // 订阅管理
  SUBSCRIBE: '/openapi/tracking/subscribe',
  UNSUBSCRIBE: (containerNo: string) => `/openapi/tracking/subscribe/${containerNo}`,
  
  // Webhook 管理
  WEBHOOK_REGISTER: '/openapi/webhook/register',
  WEBHOOK_UNREGISTER: '/openapi/webhook/unregister',
};

/**
 * 船司代码映射表
 * 4Portun 代码 -> 内部标准代码
 */
export const CARRIER_CODE_MAP: Record<string, string> = {
  'MAEU': 'MSK',      // 马士基
  'MSCU': 'MSC',      // 地中海
  'CMDU': 'CMA',      // 达飞
  'COS': 'COSCO',     // 中远海运
  'OOLU': 'OOCL',     // 东方海外
  'EGLV': 'EMC',      // 长荣
  'HLCU': 'HLC',      // 赫伯罗特
  'ONEY': 'ONE',      // ONE
  'YMLU': 'YML',      // 阳明
  'HDMU': 'HMM',      // 现代商船
  'ZIMU': 'ZIM',      // 以星
  'PCLU': 'PIL',      // 太平船务
  'WHLC': 'WHL',      // 万海
  'SMLM': 'SML',      // 森罗商船
  'KMTU': 'KMTC',     // 高丽海运
  'RCL': 'RCL',       // 宏海箱运
  'TSLU': 'TSL',      // 德翔海运
  'IAL': 'IAL',       // 亚川船务
  'NOSU': 'NOS',      // 南星海运
  'JJ': 'JJ',         // 锦江航运
};

/**
 * 港口代码映射表
 * 4Portun 代码 -> 内部标准代码
 */
export const PORT_CODE_MAP: Record<string, string> = {
  // 中国主要港口
  'CNSHG': 'CNSHA',    // 上海
  'CNNSA': 'CNNSA',    // 宁波
  'CNSZX': 'CNSZX',    // 深圳
  'CNGGZ': 'CNCAN',    // 广州
  'CNTAO': 'CNTAO',    // 青岛
  'CNTNJ': 'CNTSN',    // 天津
  'CNDLC': 'CNDLC',    // 大连
  'CNXMN': 'CNXMN',    // 厦门
  'CNFOC': 'CNFOC',    // 福州
  'CNLYG': 'CNLYG',    // 连云港
  'CNNGB': 'CNNGB',    // 宁波（备用）
  
  // 国际主要港口
  'USLAX': 'USLAX',    // 洛杉矶
  'USLGB': 'USLGB',    // 长滩
  'USNYC': 'USNYC',    // 纽约
  'USSAV': 'USSAV',    // 萨凡纳
  'USOAK': 'USOAK',    // 奥克兰
  'DEHAM': 'DEHAM',    // 汉堡
  'NLRTM': 'NLRTM',    // 鹿特丹
  'BEANR': 'BEANR',    // 安特卫普
  'GBFXT': 'GBFXT',    // 费利克斯托
  'FRLEH': 'FRLEH',    // 勒阿弗尔
  'SGSIN': 'SGSIN',    // 新加坡
  'HKHKG': 'HKHKG',    // 香港
  'KRPUS': 'KRPUS',    // 釜山
  'JPTYO': 'JPTYO',    // 东京
  'JPYOK': 'JPYOK',    // 横滨
  'JPOSA': 'JPOSA',    // 大阪
  'THBKK': 'THBKK',    // 曼谷
  'VNSGN': 'VNSGN',    // 胡志明市
  'MYTPP': 'MYTPP',    // 丹戎帕拉帕斯
  'IDJKT': 'IDJKT',    // 雅加达
  'AUMEL': 'AUMEL',    // 墨尔本
  'AUSYD': 'AUSYD',    // 悉尼
  'BRSUA': 'BRSUA',    // 桑托斯
  'ARBUE': 'ARBUE',    // 布宜诺斯艾利斯
};

/**
 * 节点代码映射表
 * 4Portun 节点代码 -> 内部标准节点代码
 */
export const NODE_CODE_MAP: Record<string, string> = {
  'BOOKED': 'BOOKED',
  'EMPTY_PICKUP': 'EMPTY_PICKUP',
  'GATE_IN': 'GATE_IN',
  'CUSTOMS_HOLD': 'CUSTOMS_HOLD',
  'CUSTOMS_RELEASED': 'CUSTOMS_RELEASED',
  'TERMINAL_HOLD': 'TERMINAL_HOLD',
  'TERMINAL_RELEASED': 'TERMINAL_RELEASED',
  'LOADED': 'LOADED',
  'DEPARTURE': 'DEPARTURE',
  'ARRIVAL': 'ARRIVAL',
  'DISCHARGED': 'DISCHARGED',
  'CUSTOMS_IMPORT': 'CUSTOMS_IMPORT',
  'FULL_PICKUP': 'FULL_PICKUP',
  'EMPTY_RETURN': 'EMPTY_RETURN',
  'DELIVERED': 'DELIVERED',
  'COMPLETED': 'COMPLETED',
};

/**
 * 状态映射表
 * 4Portun 状态 -> 内部标准状态
 */
export const STATUS_MAP: Record<string, string> = {
  'PENDING': 'BOOKED',
  'BOOKED': 'BOOKED',
  'EMPTY_PICKUP': 'EMPTY_PICKUP',
  'GATE_IN': 'GATE_IN',
  'CUSTOMS_RELEASED': 'CUSTOMS_RELEASED',
  'TERMINAL_RELEASED': 'TERMINAL_RELEASED',
  'DEPARTURE': 'DEPARTURE',
  'IN_TRANSIT': 'DEPARTURE',
  'ARRIVAL': 'ARRIVAL',
  'DISCHARGED': 'DISCHARGED',
  'FULL_PICKUP': 'FULL_PICKUP',
  'EMPTY_RETURN': 'EMPTY_RETURN',
  'COMPLETED': 'COMPLETED',
  'CANCELLED': 'CANCELLED',
};
