/**
 * 任务 1.1.2: 输入验证与安全防护 - 集装箱跟踪 DTO
 */

import { IsString, IsNotEmpty, Length, IsOptional, IsUUID } from 'class-validator';
import { IsContainerNo } from '../../../common/validators/custom.validators';

export class TrackContainerDto {
  @IsString({ message: '集装箱号必须是字符串' })
  @IsNotEmpty({ message: '集装箱号不能为空' })
  @IsContainerNo({ message: '集装箱号格式不正确，应为4位大写字母+7位数字' })
  containerNo: string;

  @IsOptional()
  @IsUUID('4', { message: '企业ID格式不正确' })
  companyId?: string;
}

/**
 * 批量查询集装箱 DTO
 */
export class BatchTrackContainersDto {
  @IsString({ each: true, message: '集装箱号必须是字符串数组' })
  @IsNotEmpty({ message: '集装箱号列表不能为空' })
  @IsContainerNo({ each: true, message: '集装箱号格式不正确' })
  containerNos: string[];
}

/**
 * 提单跟踪 DTO
 */
export class TrackBillOfLadingDto {
  @IsString({ message: '提单号必须是字符串' })
  @IsNotEmpty({ message: '提单号不能为空' })
  @Length(8, 20, { message: '提单号长度必须在8-20位之间' })
  blNo: string;
}
