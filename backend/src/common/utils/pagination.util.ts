import { Injectable } from '@nestjs/common';

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 分页元数据接口
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 分页计算结果
 */
export interface PaginationCalculation {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

/**
 * 分页结果接口
 */
export interface PaginationResult<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 分页工具类
 * 提供分页相关的计算和格式化功能
 */
@Injectable()
export class PaginationUtil {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * 计算分页参数 (skip, take, page, pageSize)
   */
  static calculate(params: PaginationParams): PaginationCalculation {
    const page = Math.max(1, params.page ?? this.DEFAULT_PAGE);
    const pageSize = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, params.pageSize ?? this.DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    return { skip, take, page, pageSize };
  }

  /**
   * 计算 skip 值
   */
  static calculateSkip(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * 计算总页数
   */
  static calculateTotalPages(total: number, pageSize: number): number {
    return Math.ceil(total / pageSize);
  }

  /**
   * 生成分页元数据
   */
  static buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      page,
      pageSize,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * 创建分页结果
   */
  static createResult<T>(
    list: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginationResult<T> {
    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: this.calculateTotalPages(total, pageSize),
      },
    };
  }

  /**
   * 获取默认分页参数
   */
  static getDefaultParams(): Required<PaginationParams> {
    return {
      page: this.DEFAULT_PAGE,
      pageSize: this.DEFAULT_PAGE_SIZE,
    };
  }

  /**
   * 规范化分页参数
   */
  static normalizeParams(params: PaginationParams): Required<PaginationParams> {
    return {
      page: Math.max(1, params.page ?? this.DEFAULT_PAGE),
      pageSize: Math.min(
        this.MAX_PAGE_SIZE,
        Math.max(1, params.pageSize ?? this.DEFAULT_PAGE_SIZE),
      ),
    };
  }

  /**
   * 验证页码是否有效
   */
  static isValidPage(page: number): boolean {
    return Number.isInteger(page) && page >= 1;
  }

  /**
   * 验证每页数量是否有效
   */
  static isValidPageSize(pageSize: number): boolean {
    return Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= this.MAX_PAGE_SIZE;
  }

  // ============ 实例方法，用于依赖注入场景 ============

  calculate(params: PaginationParams): PaginationCalculation {
    return PaginationUtil.calculate(params);
  }

  calculateSkip(page: number, pageSize: number): number {
    return PaginationUtil.calculateSkip(page, pageSize);
  }

  calculateTotalPages(total: number, pageSize: number): number {
    return PaginationUtil.calculateTotalPages(total, pageSize);
  }

  buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
    return PaginationUtil.buildMeta(total, page, pageSize);
  }

  createResult<T>(list: T[], total: number, page: number, pageSize: number): PaginationResult<T> {
    return PaginationUtil.createResult(list, total, page, pageSize);
  }

  getDefaultParams(): Required<PaginationParams> {
    return PaginationUtil.getDefaultParams();
  }

  normalizeParams(params: PaginationParams): Required<PaginationParams> {
    return PaginationUtil.normalizeParams(params);
  }
}
