import { IsString, IsNotEmpty, Length, IsEmail, IsOptional, IsMobilePhone } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(3, 20, { message: '用户名长度必须在3-20位之间' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 32, { message: '密码长度必须在6-32位之间' })
  password: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsMobilePhone('zh-CN', {}, { message: '手机号格式不正确' })
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: '企业名称不能为空' })
  @Length(2, 100, { message: '企业名称长度必须在2-100位之间' })
  companyName: string;

  @IsOptional()
  @IsString()
  realName?: string;
}
