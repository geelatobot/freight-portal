import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VerifyStatus {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class VerifyPaymentVoucherDto {
  @ApiProperty({ enum: VerifyStatus, description: '审核状态' })
  @IsEnum(VerifyStatus)
    status: VerifyStatus;

  @ApiPropertyOptional({ description: '审核备注' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
    remark?: string;
}
