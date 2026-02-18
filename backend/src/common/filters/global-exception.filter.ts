/**
 * 任务 1.1.1: 统一错误处理与日志系统 - 全局异常过滤器
 * 捕获所有异常并统一格式化响应
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ErrorMessages } from '../constants/error-codes';
import { BusinessException } from '../exceptions/business.exception';

/**
 * 统一异常响应格式
 */
export interface ExceptionResponse {
  code: ErrorCode | number | string;
  message: string;
  data?: any;
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * 全局异常过滤器
 * 捕获所有异常并统一格式化响应
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const path = request.url;
    const requestId = request.headers['x-request-id'] as string;

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let exceptionResponse: ExceptionResponse;

    // 处理业务异常
    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as any;
      exceptionResponse = {
        code: exception.code,
        message: errorResponse.message,
        data: errorResponse.data,
        timestamp: new Date().toISOString(),
        path,
        requestId,
      };
      
      this.logger.warn(
        `[BusinessException] ${path} - Code: ${exception.code}, Message: ${errorResponse.message}`,
      );
    }
    // 处理 NestJS HTTP 异常
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as any;
      
      // 映射 HTTP 状态码到错误码
      const code = this.mapHttpStatusToErrorCode(status);
      
      exceptionResponse = {
        code,
        message: typeof errorResponse === 'string' ? errorResponse : errorResponse.message || ErrorMessages[code],
        data: typeof errorResponse === 'object' ? errorResponse.data : undefined,
        timestamp: new Date().toISOString(),
        path,
        requestId,
      };

      // 根据状态码选择日志级别
      if (status >= 500) {
        this.logger.error(
          `[HttpException] ${path} - Status: ${status}, Message: ${exceptionResponse.message}`,
          exception.stack,
        );
      } else {
        this.logger.warn(
          `[HttpException] ${path} - Status: ${status}, Message: ${exceptionResponse.message}`,
        );
      }
    }
    // 处理其他未知异常
    else {
      const errorMessage = exception instanceof Error ? exception.message : '未知错误';
      const errorStack = exception instanceof Error ? exception.stack : undefined;

      exceptionResponse = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: process.env.NODE_ENV === 'production' 
          ? ErrorMessages[ErrorCode.INTERNAL_ERROR] 
          : errorMessage,
        timestamp: new Date().toISOString(),
        path,
        requestId,
      };

      this.logger.error(
        `[UnknownException] ${path} - Message: ${errorMessage}`,
        errorStack,
      );
    }

    // 发送响应
    response.status(status).json(exceptionResponse);
  }

  /**
   * 将 HTTP 状态码映射到错误码
   */
  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    const statusMap: Record<number, ErrorCode> = {
      400: ErrorCode.INVALID_PARAMS,
      401: ErrorCode.UNAUTHORIZED,
      403: ErrorCode.FORBIDDEN,
      404: ErrorCode.NOT_FOUND,
      408: ErrorCode.REQUEST_TIMEOUT,
      429: ErrorCode.TOO_MANY_REQUESTS,
      500: ErrorCode.INTERNAL_ERROR,
      503: ErrorCode.SERVICE_UNAVAILABLE,
    };
    return statusMap[status] || ErrorCode.UNKNOWN_ERROR;
  }
}
