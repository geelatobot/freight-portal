import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class TrackContainerDto {
  @IsString()
  @IsNotEmpty({ message: '集装箱号不能为空' })
  @Length(11, 11, { message: '集装箱号必须为11位' })
  containerNo: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
