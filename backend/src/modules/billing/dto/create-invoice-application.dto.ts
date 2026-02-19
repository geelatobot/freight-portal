import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { InvoiceType, InvoiceTitleType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceApplicationDto {
  @ApiProperty({ description: '账单ID' })
  @IsString()
  @IsNotEmpty()
    billId: string;

  @ApiProperty({ enum: InvoiceType, description: '发票类型' })
  @IsEnum(InvoiceType)
    invoiceType: InvoiceType;

  @ApiProperty({ enum: InvoiceTitleType, description: '抬头类型' })
  @IsEnum(InvoiceTitleType)
    titleType: InvoiceTitleType;

  @ApiProperty({ description: '抬头名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
    titleName: string;

  @ApiPropertyOptional({ description: '税号（企业抬头必填）' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @ValidateIf((o) => o.titleType === InvoiceTitleType.ENTERPRISE)
    taxNumber?: string;

  @ApiPropertyOptional({ description: '企业地址' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
    companyAddress?: string;

  @ApiPropertyOptional({ description: '企业电话' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
    companyPhone?: string;

  @ApiPropertyOptional({ description: '开户银行' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
    bankName?: string;

  @ApiPropertyOptional({ description: '银行账号' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
    bankAccount?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
    remark?: string;
}
