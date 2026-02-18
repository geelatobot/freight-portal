import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyVerificationService, SubmitCompanyInfoDto, ReviewCompanyDto } from './company-verification.service';
import { CompanyStatus } from '@prisma/client';

@Controller('company-verification')
export class CompanyVerificationController {
  constructor(private readonly companyVerificationService: CompanyVerificationService) {}

  /**
   * 提交企业认证信息
   */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submitVerification(
    @Body() dto: SubmitCompanyInfoDto,
    @Request() req,
  ) {
    return this.companyVerificationService.submitVerification(req.user.id, dto);
  }

  /**
   * 上传营业执照
   */
  @Post('upload-license')
  @UseGuards(JwtAuthGuard)
  async uploadBusinessLicense(
    @Body('companyId') companyId: string,
    @Body('fileUrl') fileUrl: string,
    @Body('fileName') fileName: string,
  ) {
    return this.companyVerificationService.uploadBusinessLicense(companyId, fileUrl, fileName);
  }

  /**
   * 获取当前企业的认证状态
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getMyVerificationStatus(@Request() req) {
    const companyId = req.user.defaultCompanyId;
    if (!companyId) {
      return { status: 'UNBOUND', message: '未绑定企业' };
    }
    return this.companyVerificationService.getVerificationStatus(companyId);
  }

  /**
   * 获取指定企业认证状态
   */
  @Get(':companyId/status')
  @UseGuards(JwtAuthGuard)
  async getVerificationStatus(@Param('companyId') companyId: string) {
    return this.companyVerificationService.getVerificationStatus(companyId);
  }

  /**
   * 重新提交认证
   */
  @Post(':companyId/resubmit')
  @UseGuards(JwtAuthGuard)
  async resubmitVerification(
    @Param('companyId') companyId: string,
    @Body() dto: SubmitCompanyInfoDto,
  ) {
    return this.companyVerificationService.resubmitVerification(companyId, dto);
  }

  /**
   * 获取审核历史
   */
  @Get(':companyId/history')
  @UseGuards(JwtAuthGuard)
  async getReviewHistory(@Param('companyId') companyId: string) {
    return this.companyVerificationService.getReviewHistory(companyId);
  }
}

/**
 * 企业认证管理后台接口
 */
@Controller('admin/company-verification')
export class CompanyVerificationAdminController {
  constructor(private readonly companyVerificationService: CompanyVerificationService) {}

  /**
   * 获取待审核企业列表
   */
  @Get('pending')
  @UseGuards(JwtAuthGuard)
  async getPendingReviews(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.companyVerificationService.getPendingReviews(
      parseInt(page),
      parseInt(pageSize),
    );
  }

  /**
   * 审核企业
   */
  @Post(':companyId/review')
  @UseGuards(JwtAuthGuard)
  async reviewCompany(
    @Param('companyId') companyId: string,
    @Body() dto: ReviewCompanyDto,
    @Request() req,
  ) {
    return this.companyVerificationService.reviewCompany(companyId, req.user.id, dto);
  }

  /**
   * 获取所有企业列表
   */
  @Get('companies')
  @UseGuards(JwtAuthGuard)
  async getAllCompanies(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: CompanyStatus,
    @Query('keyword') keyword?: string,
  ) {
    return this.companyVerificationService.getAllCompanies(
      parseInt(page),
      parseInt(pageSize),
      status,
      keyword,
    );
  }

  /**
   * 获取企业详情
   */
  @Get('companies/:companyId')
  @UseGuards(JwtAuthGuard)
  async getCompanyDetail(@Param('companyId') companyId: string) {
    return this.companyVerificationService.getVerificationStatus(companyId);
  }
}
