/**
 * 任务 1.2.1: FourPortunService 完整实现 - DTO 定义
 */

import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl, Length, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { IsContainerNo } from '../../../common/validators/custom.validators';

/**
 * 集装箱跟踪请求 DTO
 */
export class TrackContainerRequestDto {
  @IsString({ message: '集装箱号必须是字符串' })
  @IsNotEmpty({ message: '集装箱号不能为空' })
  @IsContainerNo({ message: '集装箱号格式不正确' })
    containerNo: string;
}

/**
 * 批量跟踪请求 DTO
 */
export class BatchTrackRequestDto {
  @IsArray({ message: '集装箱号列表必须是数组' })
  @IsString({ each: true, message: '集装箱号必须是字符串' })
  @IsContainerNo({ each: true, message: '集装箱号格式不正确' })
  @ArrayMinSize(1, { message: '至少需要一个集装箱号' })
  @ArrayMaxSize(50, { message: '单次最多查询50个集装箱' })
    containerNos: string[];
}

/**
 * 提单跟踪请求 DTO
 */
export class TrackBillOfLadingRequestDto {
  @IsString({ message: '提单号必须是字符串' })
  @IsNotEmpty({ message: '提单号不能为空' })
  @Length(8, 20, { message: '提单号长度必须在8-20位之间' })
    blNo: string;
}

/**
 * Webhook 订阅请求 DTO
 */
export class SubscribeTrackingDto {
  @IsString({ message: '集装箱号必须是字符串' })
  @IsNotEmpty({ message: '集装箱号不能为空' })
  @IsContainerNo({ message: '集装箱号格式不正确' })
    containerNo: string;

  @IsOptional()
  @IsUrl({}, { message: '回调URL格式不正确' })
    callbackUrl?: string;
}

/**
 * Webhook 接收 DTO
 */
export class WebhookPayloadDto {
  @IsString({ message: '事件类型必须是字符串' })
  @IsNotEmpty({ message: '事件类型不能为空' })
    eventType: string;

  @IsString({ message: '集装箱号必须是字符串' })
  @IsNotEmpty({ message: '集装箱号不能为空' })
    containerNo: string;

  @IsArray({ message: '事件列表必须是数组' })
    events: any[];

  @IsString({ message: '时间戳必须是字符串' })
  @IsNotEmpty({ message: '时间戳不能为空' })
    timestamp: string;

  @IsOptional()
  @IsString({ message: '签名必须是字符串' })
    signature?: string;
}
