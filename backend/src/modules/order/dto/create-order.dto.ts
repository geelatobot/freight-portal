/**
 * 任务 1.1.2: 输入验证与安全防护 - 创建订单 DTO
 */

import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsDecimal, 
  IsDateString,
  Length,
  Min,
  Max,
  ValidateNested,
  IsMobilePhone,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '@prisma/client';
import { IsPortCode } from '../../../common/validators/custom.validators';

export class CreateOrderDto {
  @IsEnum(OrderType, { message: '订单类型不正确' })
  @IsNotEmpty({ message: '订单类型不能为空' })
    type: OrderType;

  @IsString({ message: '起运港必须是字符串' })
  @IsNotEmpty({ message: '起运港不能为空' })
  @IsPortCode({ message: '起运港代码格式不正确，应为5位大写字母' })
    originPort: string;

  @IsString({ message: '目的港必须是字符串' })
  @IsNotEmpty({ message: '目的港不能为空' })
  @IsPortCode({ message: '目的港代码格式不正确，应为5位大写字母' })
    destinationPort: string;

  @IsString({ message: '货物描述必须是字符串' })
  @IsNotEmpty({ message: '货物描述不能为空' })
  @Length(1, 500, { message: '货物描述长度必须在1-500位之间' })
    cargoDesc: string;

  @IsOptional()
  @IsNumber({}, { message: '货物重量必须是数字' })
  @Min(0, { message: '货物重量不能小于0' })
  @Max(999999999, { message: '货物重量超出范围' })
    cargoWeight?: number;

  @IsOptional()
  @IsNumber({}, { message: '货物体积必须是数字' })
  @Min(0, { message: '货物体积不能小于0' })
    cargoVolume?: number;

  @IsOptional()
  @IsString({ message: '包装类型必须是字符串' })
  @Length(1, 50, { message: '包装类型长度必须在1-50位之间' })
    cargoPackageType?: string;

  @IsOptional()
  @IsNumber({}, { message: '包装数量必须是数字' })
  @Min(1, { message: '包装数量必须大于0' })
    cargoPackageCount?: number;

  @IsOptional()
  @IsString({ message: '集装箱类型必须是字符串' })
  @Length(1, 20, { message: '集装箱类型长度必须在1-20位之间' })
    containerType?: string;

  @IsOptional()
  @IsNumber({}, { message: '集装箱数量必须是数字' })
  @Min(1, { message: '集装箱数量必须大于0' })
    containerCount?: number;

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

  // 通知方
  @IsOptional()
  @IsString({ message: '通知方名称必须是字符串' })
  @Length(1, 100, { message: '通知方名称长度必须在1-100位之间' })
    notifyName?: string;

  @IsOptional()
  @IsString({ message: '通知方地址必须是字符串' })
  @Length(1, 500, { message: '通知方地址长度必须在1-500位之间' })
    notifyAddress?: string;

  @IsOptional()
  @IsString({ message: '通知方联系人必须是字符串' })
  @Length(1, 50, { message: '通知方联系人长度必须在1-50位之间' })
    notifyContact?: string;

  @IsOptional()
  @IsMobilePhone('zh-CN', {}, { message: '通知方电话格式不正确' })
    notifyPhone?: string;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 1000, { message: '备注长度不能超过1000位' })
    remark?: string;
}
