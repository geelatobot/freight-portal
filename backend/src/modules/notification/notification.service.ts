import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 获取通知列表
   */
  async getNotifications(userId: string, query: QueryNotificationDto) {
    const { page = 1, pageSize = 20, isRead } = query;

    const where: any = { userId };
    
    if (isRead !== undefined) {
      where.isRead = isRead === 'true' || isRead === true;
    }

    const [list, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 标记通知已读
   */
  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('无权操作此通知');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * 标记全部通知已读
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { updatedCount: result.count };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }

  /**
   * 创建通知（内部方法，供其他服务调用）
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    content: string;
    link?: string;
    metadata?: any;
  }) {
    return this.prisma.notification.create({
      data: {
        ...data,
        isRead: false,
      },
    });
  }
}
