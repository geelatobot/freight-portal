import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 基础查询 DTO
 * 包含通用的分页参数
 */
export class BaseQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码必须大于等于1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量必须大于等于1' })
  @Max(100, { message: '每页数量不能超过100' })
  pageSize?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @Min(0, { message: '跳过记录数不能为负数' })
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: '限制记录数必须大于等于1' })
  @Max(100, { message: '限制记录数不能超过100' })
  take?: number;
}

/**
 * 带日期范围的查询 DTO
 */
export class DateRangeQueryDto extends BaseQueryDto {
  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;
}

/**
 * 带关键词搜索的查询 DTO
 */
export class KeywordQueryDto extends BaseQueryDto {
  @IsOptional()
  keyword?: string;
}
