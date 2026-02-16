import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 获取用户信息
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        realName: true,
        avatar: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * 获取用户的企业列表
   */
  async getCompanies(userId: string) {
    const companyUsers = await this.prisma.companyUser.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            creditCode: true,
            contactName: true,
            contactPhone: true,
            creditLimit: true,
            creditUsed: true,
            status: true,
          },
        },
      },
    });

    return companyUsers.map(cu => ({
      id: cu.company.id,
      name: cu.company.companyName,
      creditCode: cu.company.creditCode,
      contactName: cu.company.contactName,
      contactPhone: cu.company.contactPhone,
      creditLimit: cu.company.creditLimit,
      creditUsed: cu.company.creditUsed,
      status: cu.company.status,
      role: cu.role,
      isDefault: cu.isDefault,
    }));
  }
}
