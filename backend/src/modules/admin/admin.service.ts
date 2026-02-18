import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateCreditDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 获取企业详情
   */
  async getCompanyDetail(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            bills: true,
            shipments: true,
            companyUsers: true,
          },
        },
        companyUsers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                realName: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('企业不存在');
    }

    return company;
  }

  /**
   * 更新企业信用额度
   */
  async updateCredit(id: string, dto: UpdateCreditDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('企业不存在');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        creditLimit: dto.creditLimit,
        remark: dto.remark || company.remark,
      },
    });

    return updated;
  }
}
