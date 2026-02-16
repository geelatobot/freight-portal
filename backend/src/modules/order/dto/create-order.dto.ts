import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDecimal, IsDateString } from 'class-validator';
import { OrderType } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum(OrderType)
  @IsNotEmpty({ message: '订单类型不能为空' })
  type: OrderType;

  @IsString()
  @IsNotEmpty({ message: '起运港不能为空' })
  originPort: string;

  @IsString()
  @IsNotEmpty({ message: '目的港不能为空' })
  destinationPort: string;

  @IsString()
  @IsNotEmpty({ message: '货物描述不能为空' })
  cargoDesc: string;

  @IsOptional()
  @IsNumber()
  cargoWeight?: number;

  @IsOptional()
  @IsNumber()
  cargoVolume?: number;

  @IsOptional()
  @IsString()
  cargoPackageType?: string;

  @IsOptional()
  @IsNumber()
  cargoPackageCount?: number;

  @IsOptional()
  @IsString()
  containerType?: string;

  @IsOptional()
  @IsNumber()
  containerCount?: number;

  @IsOptional()
  @IsDateString()
  etd?: string;

  @IsOptional()
  @IsDateString()
  eta?: string;

  // 发货人
  @IsOptional()
  @IsString()
  shipperName?: string;

  @IsOptional()
  @IsString()
  shipperAddress?: string;

  @IsOptional()
  @IsString()
  shipperContact?: string;

  @IsOptional()
  @IsString()
  shipperPhone?: string;

  // 收货人
  @IsOptional()
  @IsString()
  consigneeName?: string;

  @IsOptional()
  @IsString()
  consigneeAddress?: string;

  @IsOptional()
  @IsString()
  consigneeContact?: string;

  @IsOptional()
  @IsString()
  consigneePhone?: string;

  // 通知方
  @IsOptional()
  @IsString()
  notifyName?: string;

  @IsOptional()
  @IsString()
  notifyAddress?: string;

  @IsOptional()
  @IsString()
  notifyContact?: string;

  @IsOptional()
  @IsString()
  notifyPhone?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
