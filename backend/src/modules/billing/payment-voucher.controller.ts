import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaymentVoucherService } from './payment-voucher.service';
import { CreatePaymentVoucherDto } from './dto/create-payment-voucher.dto';
import { QueryPaymentVoucherDto } from './dto/query-payment-voucher.dto';
import { VerifyPaymentVoucherDto } from './dto/verify-payment-voucher.dto';

@ApiTags('支付凭证')
@Controller('payment-vouchers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentVoucherController {
  constructor(private readonly voucherService: PaymentVoucherService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传支付凭证' })
  async createVoucher(
    @Body() dto: CreatePaymentVoucherDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const companyId = req.user.companyId;
    const uploaderId = req.user.userId;
    
    // 这里应该调用文件上传服务，返回文件URL
    // 简化处理，假设文件已上传
    const fileInfo = {
      fileUrl: `/uploads/${file?.filename || 'test.jpg'}`,
      fileName: file?.originalname || 'test.jpg',
      fileSize: file?.size || 0,
    };
    
    return this.voucherService.createVoucher(companyId, uploaderId, dto, fileInfo);
  }

  @Get()
  @ApiOperation({ summary: '获取支付凭证列表' })
  async findVouchers(
    @Query() query: QueryPaymentVoucherDto,
    @Request() req,
  ) {
    const companyId = req.user.companyId;
    return this.voucherService.findVouchers(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取支付凭证详情' })
  async findVoucherById(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.voucherService.findVoucherById(id, companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除支付凭证（仅待审核状态）' })
  async deleteVoucher(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.voucherService.deleteVoucher(id, companyId);
  }

  // 管理端接口
  @Get('admin/vouchers')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '【管理端】获取所有支付凭证' })
  async findAllVouchers(@Query() query: QueryPaymentVoucherDto) {
    return this.voucherService.findAllVouchers(query);
  }

  @Put('admin/vouchers/:id/verify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '【管理端】审核支付凭证' })
  async verifyVoucher(
    @Param('id') id: string,
    @Body() dto: VerifyPaymentVoucherDto,
    @Request() req,
  ) {
    const verifierId = req.user.userId;
    return this.voucherService.verifyVoucher(id, verifierId, dto);
  }
}
