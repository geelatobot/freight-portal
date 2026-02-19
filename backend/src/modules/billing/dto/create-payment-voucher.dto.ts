import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentVoucherDto {
  @ApiProperty({ description: '账单ID' })
  @IsString()
  @IsNotEmpty()
    billId: string;

  @ApiProperty({ description: '支付金额' })
  @IsNumber()
  @Min(0.01)
    amount: number;

  @ApiProperty({ description: '支付日期' })
  @Type(() => Date)
    paymentDate: Date;

  @ApiProperty({ enum: PaymentMethod, description: '支付方式' })
  @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: '支付流水号' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
    voucherNo?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
    remark?: string;
}
