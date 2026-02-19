import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class BatchTrackDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
    containerNos: string[];

  @IsString()
  @IsOptional()
    companyId?: string;
}
