/**
 * 任务 1.1.2: 输入验证与安全防护 - 验证管道配置
 * 全局 ValidationPipe 配置
 */

import { ValidationPipe, ValidationError, BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

/**
 * 格式化验证错误信息
 */
function formatValidationErrors(errors: ValidationError[]): any {
  const result: Record<string, string[]> = {};

  errors.forEach((error) => {
    if (error.constraints) {
      result[error.property] = Object.values(error.constraints);
    }
    if (error.children && error.children.length > 0) {
      const childErrors = formatValidationErrors(error.children);
      Object.assign(result, childErrors);
    }
  });

  return result;
}

/**
 * 创建全局 ValidationPipe
 */
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    // 启用白名单，自动剔除 DTO 中未定义的属性
    whitelist: true,
    // 禁止非白名单属性，如果存在则抛出错误
    forbidNonWhitelisted: true,
    // 自动转换类型
    transform: true,
    // 转换选项
    transformOptions: {
      enableImplicitConversion: true,
    },
    // 自定义验证错误响应
    exceptionFactory: (errors: ValidationError[]) => {
      const formattedErrors = formatValidationErrors(errors);
      
      return new BadRequestException({
        code: ErrorCode.INVALID_PARAMS,
        message: '参数验证失败',
        data: formattedErrors,
        timestamp: new Date().toISOString(),
      });
    },
    // 禁用默认错误消息，使用自定义消息
    disableErrorMessages: false,
  });
}
