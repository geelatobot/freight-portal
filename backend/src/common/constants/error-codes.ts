/**
 * 任务 1.1.1: 统一错误处理与日志系统 - 错误码定义
 * 定义系统中所有错误码，便于统一管理和国际化
 */

export enum ErrorCode {
  // 成功
  SUCCESS = 0,

  // 通用错误 1xx
  UNKNOWN_ERROR = 100,
  INVALID_PARAMS = 101,
  UNAUTHORIZED = 102,
  FORBIDDEN = 103,
  NOT_FOUND = 104,
  INTERNAL_ERROR = 105,
  SERVICE_UNAVAILABLE = 106,
  REQUEST_TIMEOUT = 107,
  TOO_MANY_REQUESTS = 108,

  // 认证相关错误 2xx
  AUTH_FAILED = 200,
  TOKEN_EXPIRED = 201,
  TOKEN_INVALID = 202,
  USER_NOT_FOUND = 203,
  PASSWORD_ERROR = 204,
  ACCOUNT_LOCKED = 205,
  ACCOUNT_DISABLED = 206,
  PERMISSION_DENIED = 207,

  // 业务错误 3xx
  BUSINESS_ERROR = 300,
  DUPLICATE_DATA = 301,
  DATA_NOT_EXIST = 302,
  DATA_ALREADY_EXISTS = 303,
  OPERATION_NOT_ALLOWED = 304,
  STATUS_ERROR = 305,
  INSUFFICIENT_BALANCE = 306,
  QUOTA_EXCEEDED = 307,

  // 外部服务错误 4xx
  EXTERNAL_SERVICE_ERROR = 400,
  FOURPORTUN_API_ERROR = 401,
  FOURPORTUN_AUTH_FAILED = 402,
  FOURPORTUN_RATE_LIMIT = 403,
  FOURPORTUN_DATA_ERROR = 404,

  // 文件相关错误 5xx
  FILE_UPLOAD_ERROR = 500,
  FILE_TOO_LARGE = 501,
  FILE_TYPE_NOT_ALLOWED = 502,
  FILE_NOT_FOUND = 503,

  // 数据库错误 6xx
  DB_ERROR = 600,
  DB_CONNECTION_ERROR = 601,
  DB_QUERY_ERROR = 602,
  DB_TRANSACTION_ERROR = 603,
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: 'success',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.INVALID_PARAMS]: '参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
  [ErrorCode.REQUEST_TIMEOUT]: '请求超时',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',
  [ErrorCode.AUTH_FAILED]: '认证失败',
  [ErrorCode.TOKEN_EXPIRED]: 'Token已过期',
  [ErrorCode.TOKEN_INVALID]: 'Token无效',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.PASSWORD_ERROR]: '密码错误',
  [ErrorCode.ACCOUNT_LOCKED]: '账户已锁定',
  [ErrorCode.ACCOUNT_DISABLED]: '账户已禁用',
  [ErrorCode.PERMISSION_DENIED]: '权限不足',
  [ErrorCode.BUSINESS_ERROR]: '业务错误',
  [ErrorCode.DUPLICATE_DATA]: '数据重复',
  [ErrorCode.DATA_NOT_EXIST]: '数据不存在',
  [ErrorCode.DATA_ALREADY_EXISTS]: '数据已存在',
  [ErrorCode.OPERATION_NOT_ALLOWED]: '操作不允许',
  [ErrorCode.STATUS_ERROR]: '状态错误',
  [ErrorCode.INSUFFICIENT_BALANCE]: '余额不足',
  [ErrorCode.QUOTA_EXCEEDED]: '配额超限',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorCode.FOURPORTUN_API_ERROR]: '4Portun API错误',
  [ErrorCode.FOURPORTUN_AUTH_FAILED]: '4Portun认证失败',
  [ErrorCode.FOURPORTUN_RATE_LIMIT]: '4Portun请求频率超限',
  [ErrorCode.FOURPORTUN_DATA_ERROR]: '4Portun数据错误',
  [ErrorCode.FILE_UPLOAD_ERROR]: '文件上传失败',
  [ErrorCode.FILE_TOO_LARGE]: '文件过大',
  [ErrorCode.FILE_TYPE_NOT_ALLOWED]: '文件类型不允许',
  [ErrorCode.FILE_NOT_FOUND]: '文件不存在',
  [ErrorCode.DB_ERROR]: '数据库错误',
  [ErrorCode.DB_CONNECTION_ERROR]: '数据库连接错误',
  [ErrorCode.DB_QUERY_ERROR]: '数据库查询错误',
  [ErrorCode.DB_TRANSACTION_ERROR]: '数据库事务错误',
};
