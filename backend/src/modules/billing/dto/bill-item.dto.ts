/**
 * 任务 1.1.2: 输入验证与安全防护 - 账单明细 DTO
 */

import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsDecimal, 
  IsOptional, 
  Length,
  Min,
} from 'class-validator';

export class BillItemDto {
  @IsString({ message: '项目代码必须是字符串' })
  @IsNotEmpty({ message: '项目代码不能为空' })
  @Length(1, 50, { message: '项目代码长度必须在1-50位之间' })
  itemCode: string;

  @IsString({ message: '项目名称必须是字符串' })
  @IsNotEmpty({ message: '项目名称不能为空' })
  @Length(1, 100, { message: '项目名称长度必须在1-100位之间' })
  itemName: string;

  @IsNumber({}, { message: '数量必须是数字' })
  @Min(0, { message: '数量不能小于0' })
  quantity: number;

  @IsString({ message: '单位必须是字符串' })
  @IsNotEmpty({ message: '单位不能为空' })
  @Length(1, 20, { message: '单位长度必须在1-20位之间' })
  unit: string;

  @IsDecimal({}, { message: '单价必须是有效的金额' })
  unitPrice: string;

  @IsDecimal({}, { message: '金额必须是有效的金额' })
  amount: string;
}
