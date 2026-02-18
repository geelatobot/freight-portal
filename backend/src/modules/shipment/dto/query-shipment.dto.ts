/**
 * 任务 4.2: 更新 DTO 继承 BaseQueryDto - 查询运单 DTO
 */

import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';
import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryShipmentDto extends BaseQueryDto {
  @IsOptional()
  @IsEnum(ShipmentStatus, { message: '运单状态不正确' })
  status?: ShipmentStatus;

  @IsOptional()
  @IsString({ message: '关键词必须是字符串' })
  keyword?: string;

  @IsOptional()
  @IsString({ message: '集装箱号必须是字符串' })
  containerNo?: string;

  @IsOptional()
  @IsString({ message: '订单ID必须是字符串' })
  orderId?: string;

  @IsOptional()
  @IsString({ message: '公司ID必须是字符串' })
  companyId?: string;

  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  sortBy?: string;

  @IsOptional()
  @IsString({ message: '排序顺序必须是字符串' })
  sortOrder?: 'asc' | 'desc';
}
