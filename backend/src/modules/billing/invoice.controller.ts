import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceApplicationDto } from './dto/create-invoice-application.dto';
import { QueryInvoiceApplicationDto } from './dto/query-invoice-application.dto';
import { ReviewInvoiceApplicationDto } from './dto/review-invoice-application.dto';

@ApiTags('发票管理')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('apply')
  @ApiOperation({ summary: '申请发票' })
  async createApplication(
    @Body() dto: CreateInvoiceApplicationDto,
    @Request() req,
  ) {
    const companyId = req.user.companyId;
    const applicantId = req.user.userId;
    return this.invoiceService.createApplication(companyId, applicantId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取发票申请列表' })
  async findApplications(
    @Query() query: QueryInvoiceApplicationDto,
    @Request() req,
  ) {
    const companyId = req.user.companyId;
    return this.invoiceService.findApplications(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取发票申请详情' })
  async findApplicationById(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.invoiceService.findApplicationById(id, companyId);
  }

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消发票申请' })
  async cancelApplication(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.invoiceService.cancelApplication(id, companyId);
  }

  // 管理端接口
  @Get('admin/applications')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '【管理端】获取所有发票申请' })
  async findAllApplications(@Query() query: QueryInvoiceApplicationDto) {
    return this.invoiceService.findAllApplications(query);
  }

  @Put('admin/applications/:id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '【管理端】审核发票申请' })
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewInvoiceApplicationDto,
    @Request() req,
  ) {
    const reviewerId = req.user.userId;
    return this.invoiceService.reviewApplication(id, reviewerId, dto);
  }

  @Post('admin/applications/:id/issue')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '【管理端】开具发票' })
  async issueInvoice(
    @Param('id') id: string,
    @Body('invoiceNo') invoiceNo: string,
    @Body('downloadUrl') downloadUrl?: string,
  ) {
    return this.invoiceService.issueInvoice(id, invoiceNo, downloadUrl);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '【管理端】获取发票统计' })
  async getStats(@Request() req) {
    const companyId = req.user.companyId;
    return this.invoiceService.getStats(companyId);
  }
}
