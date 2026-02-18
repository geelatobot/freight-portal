import { PrismaClient } from '@prisma/client';
import { PaginationUtil, PaginationParams, PaginationMeta } from '../utils/pagination.util';

export interface FindAllOptions {
  where?: Record<string, any>;
  include?: Record<string, any>;
  orderBy?: Record<string, any>;
  skip?: number;
  take?: number;
}

export interface PaginatedResult<T> {
  list: T[];
  pagination: PaginationMeta;
}

export interface PaginationQuery extends PaginationParams {
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 基础仓储类
 * 提供通用的 CRUD 和分页功能
 */
export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly model: string,
  ) {}

  /**
   * 获取 Prisma 模型代理
   */
  protected get modelDelegate(): any {
    return (this.prisma as any)[this.model];
  }

  /**
   * 查询所有记录
   */
  async findAll(options?: FindAllOptions): Promise<T[]> {
    return this.modelDelegate.findMany(options);
  }

  /**
   * 根据 ID 查询单条记录
   */
  async findOne(id: string, include?: Record<string, any>): Promise<T | null> {
    return this.modelDelegate.findUnique({
      where: { id },
      include,
    });
  }

  /**
   * 根据条件查询单条记录
   */
  async findFirst(where: Record<string, any>, include?: Record<string, any>): Promise<T | null> {
    return this.modelDelegate.findFirst({
      where,
      include,
    });
  }

  /**
   * 创建记录
   */
  async create(data: CreateDto, include?: Record<string, any>): Promise<T> {
    return this.modelDelegate.create({
      data,
      include,
    });
  }

  /**
   * 更新记录
   */
  async update(id: string, data: UpdateDto, include?: Record<string, any>): Promise<T> {
    return this.modelDelegate.update({
      where: { id },
      data,
      include,
    });
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<void> {
    await this.modelDelegate.delete({
      where: { id },
    });
  }

  /**
   * 批量删除
   */
  async deleteMany(where: Record<string, any>): Promise<number> {
    const result = await this.modelDelegate.deleteMany({ where });
    return result.count;
  }

  /**
   * 统计记录数
   */
  async count(where?: Record<string, any>): Promise<number> {
    return this.modelDelegate.count({ where });
  }

  /**
   * 分页查询
   */
  async paginate(
    query: PaginationQuery,
    baseWhere?: Record<string, any>,
    include?: Record<string, any>,
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, pageSize } = PaginationUtil.calculate(query);
    
    const where = { ...baseWhere };
    
    // 处理关键字搜索
    if (query.keyword && this.getSearchFields().length > 0) {
      const searchFields = this.getSearchFields();
      (where as any).OR = searchFields.map(field => ({
        [field]: { contains: query.keyword },
      }));
    }

    // 处理排序
    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    const [list, total] = await Promise.all([
      this.modelDelegate.findMany({
        where,
        include,
        skip,
        take,
        orderBy,
      }),
      this.modelDelegate.count({ where }),
    ]);

    return {
      list,
      pagination: PaginationUtil.buildMeta(total, page, pageSize),
    };
  }

  /**
   * 搜索功能
   */
  async search(
    keyword: string,
    options?: Omit<FindAllOptions, 'where'>,
  ): Promise<T[]> {
    const searchFields = this.getSearchFields();
    
    if (searchFields.length === 0) {
      return [];
    }

    const where = {
      OR: searchFields.map(field => ({
        [field]: { contains: keyword },
      })),
    };

    return this.modelDelegate.findMany({
      where,
      ...options,
    });
  }

  /**
   * 检查记录是否存在
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.modelDelegate.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * 获取可搜索字段
   * 子类可以重写此方法定义搜索字段
   */
  protected abstract getSearchFields(): string[];

  /**
   * 构建排序条件
   */
  protected buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Record<string, any> {
    if (sortBy) {
      return { [sortBy]: sortOrder };
    }
    // 默认按创建时间倒序
    return { createdAt: 'desc' };
  }
}
