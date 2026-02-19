import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { InvoiceApplicationStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryInvoiceApplicationDto {
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

  @ApiPropertyOptional({ enum: InvoiceApplicationStatus, description: '状态筛选' })
  @IsEnum(InvoiceApplicationStatus)
  @IsOptional()
    status?: InvoiceApplicationStatus;

  @ApiPropertyOptional({ description: '关键词搜索（申请号、抬头名称）' })
  @IsString()
  @IsOptional()
    keyword?: string;
}
