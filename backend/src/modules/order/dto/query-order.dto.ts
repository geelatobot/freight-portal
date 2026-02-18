/**
 * 任务 4.2: 更新 DTO 继承 BaseQueryDto - 查询订单 DTO
 */

import { IsString, IsOptional, IsEnum, IsDateString, Length } from 'class-validator';
import { OrderStatus, OrderType } from '@prisma/client';
import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryOrderDto extends BaseQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: '订单状态不正确' })
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderType, { message: '订单类型不正确' })
  type?: OrderType;

  @IsOptional()
  @IsString({ message: '关键词必须是字符串' })
  @Length(1, 100, { message: '关键词长度必须在1-100位之间' })
  keyword?: string;

  @IsOptional()
  @IsDateString({}, { message: '开始日期格式不正确' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束日期格式不正确' })
  endDate?: string;
}
