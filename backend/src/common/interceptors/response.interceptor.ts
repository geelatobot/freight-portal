/**
 * 任务 1.1.1: 统一错误处理与日志系统 - 响应拦截器
 * 统一 API 响应格式
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ErrorCode } from '../constants/error-codes';

/**
 * 统一响应格式接口
 */
export interface ApiResponse<T = any> {
  code: ErrorCode;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
  requestId?: string;
}

/**
 * 响应拦截器
 * 统一格式化所有成功响应
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse<Response>();
    
    const path = request.url;
    const requestId = request.headers['x-request-id'] as string;

    return next.handle().pipe(
      map((data: T) => {
        // 如果响应已经是标准格式，直接返回
        if (this.isStandardResponse(data)) {
          return data as ApiResponse<T>;
        }

        // 处理空响应
        if (data === null || data === undefined) {
          data = {} as T;
        }

        // 处理原始数据（可能是数组、对象等）
        return {
          code: ErrorCode.SUCCESS,
          message: 'success',
          data,
          timestamp: new Date().toISOString(),
          path,
          requestId,
        };
      }),
    );
  }

  /**
   * 检查是否已经是标准响应格式
   */
  private isStandardResponse(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }
    return (
      'code' in data &&
      'message' in data &&
      'data' in data &&
      'timestamp' in data
    );
  }
}
