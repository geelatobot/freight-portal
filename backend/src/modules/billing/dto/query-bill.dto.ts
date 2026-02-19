/**
 * 任务 4.2: 更新 DTO 继承 BaseQueryDto - 查询账单 DTO
 */

import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { BillStatus } from '@prisma/client';
import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryBillDto extends BaseQueryDto {
  @IsOptional()
  @IsEnum(BillStatus, { message: '账单状态不正确' })
    status?: BillStatus;

  @IsOptional()
  @IsString({ message: '关键词必须是字符串' })
    keyword?: string;

  @IsOptional()
  @IsDateString({}, { message: '开始日期格式不正确' })
    startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束日期格式不正确' })
    endDate?: string;
}
