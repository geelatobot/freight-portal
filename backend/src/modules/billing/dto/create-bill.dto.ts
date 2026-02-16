import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';

class BillItemDto {
  @IsString()
  @IsNotEmpty()
  itemCode: string;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsDecimal()
  unitPrice: string;

  @IsDecimal()
  amount: string;
}

export class CreateBillDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsNotEmpty()
  billType: string;

  @IsDecimal()
  amount: string;

  @IsString()
  currency: string = 'CNY';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @IsString()
  @IsOptional()
  remark?: string;
}
