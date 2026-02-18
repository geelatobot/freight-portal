/**
 * 更新订阅 DTO
 */

import { IsString, IsOptional, IsBoolean, IsInt, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SubscriptionAction {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  UPDATE = 'update',
}

export class SubscriptionItemDto {
  @IsString()
  containerNo: string;

  @IsEnum(SubscriptionAction)
  action: SubscriptionAction;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsBoolean()
  @IsOptional()
  autoSync?: boolean;

  @IsInt()
  @IsOptional()
  syncInterval?: number;

  @IsString()
  @IsOptional()
  remark?: string;
}

export class UpdateSubscriptionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionItemDto)
  items: SubscriptionItemDto[];
}

export class SubscriptionQueryDto {
  @IsString()
  @IsOptional()
  containerNo?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsBoolean()
  @IsOptional()
  isSubscribed?: boolean;

  @IsBoolean()
  @IsOptional()
  externalSubscribed?: boolean;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}
