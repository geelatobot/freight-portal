/**
 * 任务 1.1.2: 输入验证与安全防护 - 刷新 Token DTO
 */

import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: '刷新令牌必须是字符串' })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
    refreshToken: string;

  @IsOptional()
  @IsUUID('4', { message: '设备ID格式不正确' })
    deviceId?: string;
}
