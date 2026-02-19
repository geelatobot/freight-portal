import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewInvoiceApplicationDto {
  @ApiProperty({ enum: ReviewStatus, description: '审核状态' })
  @IsEnum(ReviewStatus)
    status: ReviewStatus;

  @ApiPropertyOptional({ description: '审核备注' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
    remark?: string;
}
