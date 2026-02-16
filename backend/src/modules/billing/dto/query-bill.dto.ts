import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { BillStatus } from '@prisma/client';

export class QueryBillDto {
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;
}
