import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, CompanyStatus, Prisma } from '@prisma/client';

export interface SubmitCompanyInfoDto {
  companyName: string;
  creditCode: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  businessLicenseUrl?: string;
  remark?: string;
}

export interface ReviewCompanyDto {
  approved: boolean;
  reason?: string;
  creditLimit?: number;
}

export interface CompanyVerification {
  id: string;
  companyId: string;
  businessLicenseUrl?: string;
  legalPersonName?: string;
  legalPersonIdCard?: string;
  verificationStatus: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  reviewRemark?: string;
}

@Injectable()
export class CompanyVerificationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 提交企业认证信息
   */
  async submitVerification(
    userId: string,
    dto: SubmitCompanyInfoDto,
  ) {
    // 检查用户是否已有企业
    const existingCompanyUser = await this.prisma.companyUser.findFirst({
      where: { userId },
      include: { company: true },
    });

    let company;

    if (existingCompanyUser) {
      // 更新现有企业信息
      company = await this.prisma.company.update({
        where: { id: existingCompanyUser.companyId },
        data: {
          companyName: dto.companyName,
          creditCode: dto.creditCode,
          address: dto.address,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          status: CompanyStatus.PENDING,
        },
      });
    } else {
      // 创建新企业
      company = await this.prisma.company.create({
        data: {
          companyName: dto.companyName,
          creditCode: dto.creditCode,
          address: dto.address,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          status: CompanyStatus.PENDING,
        },
      });

      // 将用户关联到企业，设为管理员
      await this.prisma.companyUser.create({
        data: {
          userId,
          companyId: company.id,
          role: 'ADMIN',
          isDefault: true,
        },
      });
    }

    // 创建或更新认证记录
    await this.prisma.$executeRaw`
      INSERT INTO company_verifications (
        id, company_id, business_license_url, submitted_at, verification_status, remark
      ) VALUES (
        UUID(), ${company.id}, ${dto.businessLicenseUrl}, NOW(), 'PENDING', ${dto.remark}
      )
      ON DUPLICATE KEY UPDATE
        business_license_url = VALUES(business_license_url),
        submitted_at = VALUES(submitted_at),
        verification_status = VALUES(verification_status),
        remark = VALUES(remark),
        reviewed_at = NULL,
        reviewer_id = NULL,
        review_remark = NULL
    `;

    return {
      companyId: company.id,
      status: CompanyStatus.PENDING,
      message: '企业认证信息已提交，等待审核',
    };
  }

  /**
   * 上传营业执照
   */
  async uploadBusinessLicense(
    companyId: string,
    fileUrl: string,
    fileName?: string,
  ) {
    await this.prisma.$executeRaw`
      INSERT INTO company_verifications (
        id, company_id, business_license_url, submitted_at, verification_status
      ) VALUES (
        UUID(), ${companyId}, ${fileUrl}, NOW(), 'PENDING'
      )
      ON DUPLICATE KEY UPDATE
        business_license_url = VALUES(business_license_url),
        submitted_at = VALUES(submitted_at),
        verification_status = VALUES(verification_status)
    `;

    return {
      companyId,
      fileUrl,
      fileName,
      message: '营业执照上传成功',
    };
  }

  /**
   * 获取企业认证状态
   */
  async getVerificationStatus(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        companyName: true,
        creditCode: true,
        status: true,
        creditLimit: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      throw new NotFoundException('企业不存在');
    }

    const verification = await this.prisma.$queryRaw<CompanyVerification[]>`
      SELECT 
        id,
        company_id as companyId,
        business_license_url as businessLicenseUrl,
        legal_person_name as legalPersonName,
        legal_person_id_card as legalPersonIdCard,
        verification_status as verificationStatus,
        submitted_at as submittedAt,
        reviewed_at as reviewedAt,
        reviewer_id as reviewerId,
        review_remark as reviewRemark
      FROM company_verifications
      WHERE company_id = ${companyId}
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    return {
      company,
      verification: verification[0] || null,
      statusLabel: this.getStatusLabel(company.status),
    };
  }

  /**
   * 获取待审核企业列表
   */
  async getPendingReviews(page: number = 1, pageSize: number = 20) {
    const where: Prisma.CompanyWhereInput = {
      status: CompanyStatus.PENDING,
    };

    const [list, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          creditCode: true,
          address: true,
          contactName: true,
          contactPhone: true,
          contactEmail: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          companyUsers: {
            where: { role: 'ADMIN' },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    // 获取认证信息
    const companyIds = list.map(c => c.id);
    const verifications = await this.prisma.$queryRaw<CompanyVerification[]>`
      SELECT 
        company_id as companyId,
        business_license_url as businessLicenseUrl,
        submitted_at as submittedAt,
        verification_status as verificationStatus
      FROM company_verifications
      WHERE company_id IN (${Prisma.join(companyIds)})
    `;

    const verificationMap = new Map(verifications.map(v => [v.companyId, v]));

    return {
      list: list.map(company => ({
        ...company,
        verification: verificationMap.get(company.id) || null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 审核企业
   */
  async reviewCompany(
    companyId: string,
    reviewerId: string,
    dto: ReviewCompanyDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('企业不存在');
    }

    if (company.status !== CompanyStatus.PENDING) {
      throw new BadRequestException('该企业不在待审核状态');
    }

    const newStatus = dto.approved ? CompanyStatus.ACTIVE : CompanyStatus.REJECTED;

    // 更新企业状态
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        status: newStatus,
        creditLimit: dto.creditLimit || company.creditLimit,
      },
    });

    // 更新认证记录
    await this.prisma.$executeRaw`
      UPDATE company_verifications
      SET 
        verification_status = ${newStatus},
        reviewed_at = NOW(),
        reviewer_id = ${reviewerId},
        review_remark = ${dto.reason}
      WHERE company_id = ${companyId}
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    // 发送通知给企业管理员的逻辑可以在这里添加
    await this.sendReviewNotification(companyId, newStatus, dto.reason);

    return {
      companyId,
      status: newStatus,
      statusLabel: this.getStatusLabel(newStatus),
      message: dto.approved ? '企业审核通过' : '企业审核已拒绝',
    };
  }

  /**
   * 获取企业审核历史
   */
  async getReviewHistory(companyId: string) {
    const history = await this.prisma.$queryRaw`
      SELECT 
        v.id,
        v.company_id as companyId,
        v.verification_status as verificationStatus,
        v.submitted_at as submittedAt,
        v.reviewed_at as reviewedAt,
        v.reviewer_id as reviewerId,
        u.real_name as reviewerName,
        v.review_remark as reviewRemark
      FROM company_verifications v
      LEFT JOIN users u ON v.reviewer_id = u.id
      WHERE v.company_id = ${companyId}
      ORDER BY v.submitted_at DESC
    `;

    return history;
  }

  /**
   * 重新提交认证（被拒绝后）
   */
  async resubmitVerification(
    companyId: string,
    dto: SubmitCompanyInfoDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('企业不存在');
    }

    if (company.status !== CompanyStatus.REJECTED) {
      throw new BadRequestException('只有被拒绝的企业可以重新提交');
    }

    // 更新企业信息
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        companyName: dto.companyName,
        creditCode: dto.creditCode,
        address: dto.address,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        status: CompanyStatus.PENDING,
      },
    });

    // 创建新的认证记录
    await this.prisma.$executeRaw`
      INSERT INTO company_verifications (
        id, company_id, business_license_url, submitted_at, verification_status, remark
      ) VALUES (
        UUID(), ${companyId}, ${dto.businessLicenseUrl}, NOW(), 'PENDING', ${dto.remark}
      )
    `;

    return {
      companyId,
      status: CompanyStatus.PENDING,
      message: '企业认证信息已重新提交，等待审核',
    };
  }

  /**
   * 发送审核状态通知
   */
  private async sendReviewNotification(
    companyId: string,
    status: CompanyStatus,
    reason?: string,
  ) {
    // 获取企业管理员
    const adminUsers = await this.prisma.companyUser.findMany({
      where: {
        companyId,
        role: 'ADMIN',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const message = status === CompanyStatus.ACTIVE
      ? '您的企业认证已通过审核'
      : `您的企业认证未通过审核${reason ? '，原因：' + reason : ''}`;

    // 这里可以集成短信、邮件或微信通知
    for (const admin of adminUsers) {
      console.log(`发送通知给用户 ${admin.userId}: ${message}`);
      // TODO: 调用通知服务发送消息
    }

    return {
      notifiedUsers: adminUsers.length,
      message,
    };
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status: CompanyStatus): string {
    const labels: Record<CompanyStatus, string> = {
      [CompanyStatus.PENDING]: '待审核',
      [CompanyStatus.ACTIVE]: '正常',
      [CompanyStatus.SUSPENDED]: '暂停',
      [CompanyStatus.REJECTED]: '已拒绝',
    };
    return labels[status] || status;
  }

  /**
   * 获取所有企业认证列表（管理后台）
   */
  async getAllCompanies(
    page: number = 1,
    pageSize: number = 20,
    status?: CompanyStatus,
    keyword?: string,
  ) {
    const where: Prisma.CompanyWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { companyName: { contains: keyword } },
        { creditCode: { contains: keyword } },
        { contactName: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          creditCode: true,
          address: true,
          contactName: true,
          contactPhone: true,
          contactEmail: true,
          creditLimit: true,
          creditUsed: true,
          status: true,
          remark: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              companyUsers: true,
              orders: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      list: list.map(company => ({
        ...company,
        statusLabel: this.getStatusLabel(company.status),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
