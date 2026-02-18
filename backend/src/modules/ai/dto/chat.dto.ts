/**
 * 任务 1.1.2: 输入验证与安全防护 - AI 聊天 DTO
 */

import { IsString, IsNotEmpty, IsOptional, IsUUID, Length } from 'class-validator';

export class ChatDto {
  @IsString({ message: '消息内容必须是字符串' })
  @IsNotEmpty({ message: '消息内容不能为空' })
  @Length(1, 2000, { message: '消息内容长度必须在1-2000位之间' })
  message: string;

  @IsOptional()
  @IsString({ message: '会话ID必须是字符串' })
  @Length(1, 100, { message: '会话ID长度必须在1-100位之间' })
  sessionId?: string;

  @IsOptional()
  @IsUUID('4', { message: '企业ID格式不正确' })
  companyId?: string;
}
