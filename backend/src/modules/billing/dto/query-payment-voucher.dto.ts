import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { VoucherStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryPaymentVoucherDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
    page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
    pageSize?: number = 20;

  @ApiPropertyOptional({ enum: VoucherStatus, description: '状态筛选' })
  @IsEnum(VoucherStatus)
  @IsOptional()
    status?: VoucherStatus;

  @ApiPropertyOptional({ description: '账单ID筛选' })
  @IsString()
  @IsOptional()
    billId?: string;
}
