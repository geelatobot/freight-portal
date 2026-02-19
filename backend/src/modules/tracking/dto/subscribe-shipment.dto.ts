import { IsString, IsOptional } from 'class-validator';

export class SubscribeShipmentDto {
  @IsString()
  @IsOptional()
    email?: string;

  @IsString()
  @IsOptional()
    phone?: string;
}
