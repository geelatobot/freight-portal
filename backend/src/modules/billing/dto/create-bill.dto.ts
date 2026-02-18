/**
 * 任务 1.1.2: 输入验证与安全防护 - 创建账单 DTO
 */

import { 
  IsString, 
  IsNotEmpty, 
  IsArray, 
  ValidateNested, 
  IsDecimal, 
  IsOptional,
  IsUUID,
  Length,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillItemDto } from './bill-item.dto';

export class CreateBillDto {
  @IsString({ message: '企业ID必须是字符串' })
  @IsNotEmpty({ message: '企业ID不能为空' })
  @IsUUID('4', { message: '企业ID格式不正确' })
  companyId: string;

  @IsOptional()
  @IsUUID('4', { message: '订单ID格式不正确' })
  orderId?: string;

  @IsString({ message: '账单类型必须是字符串' })
  @IsNotEmpty({ message: '账单类型不能为空' })
  @Length(1, 50, { message: '账单类型长度必须在1-50位之间' })
  billType: string;

  @IsDecimal({}, { message: '金额必须是有效的金额' })
  amount: string;

  @IsString({ message: '货币类型必须是字符串' })
  @IsNotEmpty({ message: '货币类型不能为空' })
  @Length(3, 3, { message: '货币类型必须为3位字符' })
  currency: string = 'CNY';

  @IsArray({ message: '账单明细必须是数组' })
  @ValidateNested({ each: true, message: '账单明细格式不正确' })
  @Type(() => BillItemDto)
  @ArrayMinSize(1, { message: '账单明细至少包含一项' })
  items: BillItemDto[];

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 1000, { message: '备注长度不能超过1000位' })
  remark?: string;
}
