/**
 * Admin 模块 DTO
 */

import { IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCreditDto {
  @IsNumber({}, { message: '信用额度必须是数字' })
  creditLimit: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 500, { message: '备注长度不能超过500位' })
  remark?: string;
}
