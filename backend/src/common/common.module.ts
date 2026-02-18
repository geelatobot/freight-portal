/**
 * 任务 1.1.1 & 1.1.2 & 2.4: 统一错误处理、日志系统、输入验证与安全防护
 * 公共模块
 */

import { Module, Global } from '@nestjs/common';
import { WinstonLoggerService } from './logger/winston-logger.service';
import {
  CodeGeneratorService,
  DataSanitizerService,
  DateUtilService,
} from './services';

@Global()
@Module({
  providers: [
    WinstonLoggerService,
    CodeGeneratorService,
    DataSanitizerService,
    DateUtilService,
  ],
  exports: [
    WinstonLoggerService,
    CodeGeneratorService,
    DataSanitizerService,
    DateUtilService,
  ],
})
export class CommonModule {}
