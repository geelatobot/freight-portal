import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { QueryBillDto } from './dto/query-bill.dto';
import { CreateBillDto } from './dto/create-bill.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('bills')
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: QueryBillDto, @Request() req) {
    const companyId = req.query.companyId || req.user.defaultCompanyId;
    return this.billingService.findAll(companyId, query);
  }

  @Get('bills/:id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    const companyId = req.user.role === 'ADMIN' ? undefined : req.user.defaultCompanyId;
    return this.billingService.findOne(id, companyId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req) {
    const companyId = req.user.defaultCompanyId;
    return this.billingService.getStats(companyId);
  }

  // 管理后台接口
  @Post('bills')
  @UseGuards(JwtAuthGuard)
  async createBill(@Body() createBillDto: CreateBillDto) {
    return this.billingService.createBill(createBillDto);
  }

  @Put('bills/:id/payment')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(
    @Param('id') id: string,
    @Body('paidAmount') paidAmount: number,
    @Body('remark') remark?: string,
  ) {
    return this.billingService.confirmPayment(id, paidAmount, remark);
  }
}
