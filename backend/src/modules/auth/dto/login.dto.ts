import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 32, { message: '密码长度必须在6-32位之间' })
  password: string;

  @IsOptional()
  ip?: string;
}
