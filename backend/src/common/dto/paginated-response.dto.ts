import { IsArray, IsObject, IsNumber } from 'class-validator';

/**
 * 分页元数据 DTO
 */
export class PaginationMetaDto {
  @IsNumber()
  page: number;

  @IsNumber()
  pageSize: number;

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  constructor(page: number, pageSize: number, total: number) {
    this.page = page;
    this.pageSize = pageSize;
    this.total = total;
    this.totalPages = Math.ceil(total / pageSize);
  }
}

/**
 * 分页响应 DTO
 * @template T 列表项类型
 */
export class PaginatedResponseDto<T> {
  @IsArray()
  list: T[];

  @IsObject()
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  constructor(list: T[], page: number, pageSize: number, total: number) {
    this.list = list;
    this.pagination = {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 创建分页响应
   * @param list 数据列表
   * @param page 当前页
   * @param pageSize 每页数量
   * @param total 总记录数
   * @returns PaginatedResponseDto 实例
   */
  static create<T>(list: T[], page: number, pageSize: number, total: number): PaginatedResponseDto<T> {
    return new PaginatedResponseDto(list, page, pageSize, total);
  }
}
