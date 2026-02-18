/**
 * 任务 1.1.2: 输入验证与安全防护 - 更新订单 DTO
 */

import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsDateString,
  Length,
  Min,
  Max,
  IsMobilePhone,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { IsPortCode } from '../../../common/validators/custom.validators';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: '订单状态不正确' })
  status?: OrderStatus;

  @IsOptional()
  @IsString({ message: '子状态必须是字符串' })
  @Length(1, 50, { message: '子状态长度必须在1-50位之间' })
  subStatus?: string;

  @IsOptional()
  @IsPortCode({ message: '起运港代码格式不正确' })
  originPort?: string;

  @IsOptional()
  @IsPortCode({ message: '目的港代码格式不正确' })
  destinationPort?: string;

  @IsOptional()
  @IsString({ message: '货物描述必须是字符串' })
  @Length(1, 500, { message: '货物描述长度必须在1-500位之间' })
  cargoDesc?: string;

  @IsOptional()
  @IsNumber({}, { message: '货物重量必须是数字' })
  @Min(0, { message: '货物重量不能小于0' })
  cargoWeight?: number;

  @IsOptional()
  @IsNumber({}, { message: '货物体积必须是数字' })
  @Min(0, { message: '货物体积不能小于0' })
  cargoVolume?: number;

  @IsOptional()
  @IsDateString({}, { message: '预计离港时间格式不正确' })
  etd?: string;

  @IsOptional()
  @IsDateString({}, { message: '预计到港时间格式不正确' })
  eta?: string;

  // 发货人
  @IsOptional()
  @IsString({ message: '发货人名称必须是字符串' })
  @Length(1, 100, { message: '发货人名称长度必须在1-100位之间' })
  shipperName?: string;

  @IsOptional()
  @IsString({ message: '发货人地址必须是字符串' })
  @Length(1, 500, { message: '发货人地址长度必须在1-500位之间' })
  shipperAddress?: string;

  @IsOptional()
  @IsString({ message: '发货人联系人必须是字符串' })
  @Length(1, 50, { message: '发货人联系人长度必须在1-50位之间' })
  shipperContact?: string;

  @IsOptional()
  @IsMobilePhone('zh-CN', {}, { message: '发货人电话格式不正确' })
  shipperPhone?: string;

  // 收货人
  @IsOptional()
  @IsString({ message: '收货人名称必须是字符串' })
  @Length(1, 100, { message: '收货人名称长度必须在1-100位之间' })
  consigneeName?: string;

  @IsOptional()
  @IsString({ message: '收货人地址必须是字符串' })
  @Length(1, 500, { message: '收货人地址长度必须在1-500位之间' })
  consigneeAddress?: string;

  @IsOptional()
  @IsString({ message: '收货人联系人必须是字符串' })
  @Length(1, 50, { message: '收货人联系人长度必须在1-50位之间' })
  consigneeContact?: string;

  @IsOptional()
  @IsMobilePhone('zh-CN', {}, { message: '收货人电话格式不正确' })
  consigneePhone?: string;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 1000, { message: '备注长度不能超过1000位' })
  remark?: string;
}
