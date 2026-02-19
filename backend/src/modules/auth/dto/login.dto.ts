/**
 * 任务 1.1.2: 输入验证与安全防护 - 登录 DTO
 */

import { IsString, IsNotEmpty, Length, IsOptional, IsIP } from 'class-validator';

export class LoginDto {
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(3, 50, { message: '用户名长度必须在3-50位之间' })
    username: string;

  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 32, { message: '密码长度必须在6-32位之间' })
    password: string;

  @IsOptional()
  @IsIP('4', { message: 'IP地址格式不正确' })
    ip?: string;
}
