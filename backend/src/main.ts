/**
 * 任务 1.1.1 & 1.1.2: 统一错误处理、日志系统、输入验证与安全防护
 * 应用程序入口文件
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

// 导入全局配置
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createGlobalValidationPipe } from './common/validators/validation-pipe.config';
import { WinstonLoggerService } from './common/logger/winston-logger.service';

async function bootstrap() {
  // 创建 Winston Logger
  const logger = new WinstonLoggerService(process.env.LOG_LEVEL || 'info');
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger,
    bufferLogs: true, // 缓冲日志直到 Winston 初始化完成
  });

  const configService = app.get(ConfigService);

  // ========== 安全中间件 ==========
  // Helmet 安全响应头
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // 压缩响应
  app.use(compression());

  // CORS 配置
  const corsOrigin = configService.get('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400, // 24小时
  });

  // ========== 全局管道 ==========
  // 使用自定义验证管道
  app.useGlobalPipes(createGlobalValidationPipe());

  // ========== 全局拦截器 ==========
  // 响应拦截器 - 统一响应格式
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ========== 全局过滤器 ==========
  // 异常过滤器 - 统一错误处理
  app.useGlobalFilters(new GlobalExceptionFilter());

  // API 前缀
  app.setGlobalPrefix(configService.get('API_PREFIX') || '/api/v1');

  // 启动服务
  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${configService.get('NODE_ENV') || 'development'}`);
  logger.log(`CORS Origin: ${corsOrigin || 'default'}`);
}

bootstrap();
