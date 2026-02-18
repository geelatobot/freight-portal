/**
 * 任务 1.1.1: 统一错误处理与日志系统 - 业务异常类
 * 用于区分业务异常和系统异常
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessages } from '../constants/error-codes';

/**
 * 业务异常类
 * 用于抛出业务逻辑相关的错误
 */
export class BusinessException extends HttpException {
  public readonly code: ErrorCode;
  public readonly data?: any;

  constructor(code: ErrorCode, message?: string, data?: any, status: number = HttpStatus.BAD_REQUEST) {
    super(
      {
        code,
        message: message || ErrorMessages[code] || '业务错误',
        data,
        timestamp: new Date().toISOString(),
      },
      status,
    );
    this.code = code;
    this.data = data;
  }
}

/**
 * 参数异常
 */
export class ValidationException extends BusinessException {
  constructor(message: string = '参数验证失败', data?: any) {
    super(ErrorCode.INVALID_PARAMS, message, data, HttpStatus.BAD_REQUEST);
  }
}

/**
 * 认证异常
 */
export class AuthException extends BusinessException {
  constructor(code: ErrorCode = ErrorCode.AUTH_FAILED, message?: string) {
    super(code, message || ErrorMessages[code], undefined, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * 资源不存在异常
 */
export class NotFoundException extends BusinessException {
  constructor(message: string = '资源不存在', data?: any) {
    super(ErrorCode.NOT_FOUND, message, data, HttpStatus.NOT_FOUND);
  }
}

/**
 * 权限不足异常
 */
export class ForbiddenException extends BusinessException {
  constructor(message: string = '权限不足') {
    super(ErrorCode.FORBIDDEN, message, undefined, HttpStatus.FORBIDDEN);
  }
}

/**
 * 外部服务异常
 */
export class ExternalServiceException extends BusinessException {
  constructor(
    code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
    message?: string,
    data?: any,
    status: number = HttpStatus.SERVICE_UNAVAILABLE,
  ) {
    super(code, message || ErrorMessages[code], data, status);
  }
}

/**
 * 4Portun API 异常
 */
export class FourPortunException extends ExternalServiceException {
  constructor(
    code: ErrorCode = ErrorCode.FOURPORTUN_API_ERROR,
    message?: string,
    data?: any,
  ) {
    super(code, message || ErrorMessages[code], data, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
