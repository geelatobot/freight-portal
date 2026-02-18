import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillLifecycleService, GenerateBillFromOrderDto, GenerateBillFromShipmentDto, UpdateBillItemDto } from './bill-lifecycle.service';
import { BillStatus, BillType } from '@prisma/client';

@Controller('bills')
export class BillLifecycleController {
  constructor(private readonly billLifecycleService: BillLifecycleService) {}

  /**
   * 基于订单生成账单
   */
  @Post('generate-from-order')
  @UseGuards(JwtAuthGuard)
  async generateFromOrder(@Body() dto: GenerateBillFromOrderDto) {
    return this.billLifecycleService.generateFromOrder(dto);
  }

  /**
   * 基于货物生成账单
   */
  @Post('generate-from-shipment')
  @UseGuards(JwtAuthGuard)
  async generateFromShipment(@Body() dto: GenerateBillFromShipmentDto) {
    return this.billLifecycleService.generateFromShipment(dto);
  }

  /**
   * 账单状态流转
   */
  @Post(':id/transition')
  @UseGuards(JwtAuthGuard)
  async transitionStatus(
    @Param('id') billId: string,
    @Body('status') status: BillStatus,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.billLifecycleService.transitionStatus(billId, status, req.user.id, reason);
  }

  /**
   * 开具账单 (DRAFT → ISSUED)
   */
  @Post(':id/issue')
  @UseGuards(JwtAuthGuard)
  async issueBill(
    @Param('id') billId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.billLifecycleService.transitionStatus(billId, BillStatus.ISSUED, req.user.id, reason);
  }

  /**
   * 取消账单
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelBill(
    @Param('id') billId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.billLifecycleService.transitionStatus(billId, BillStatus.CANCELLED, req.user.id, reason);
  }

  /**
   * 确认收款
   */
  @Post(':id/payment')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(
    @Param('id') billId: string,
    @Body('paidAmount') paidAmount: number,
    @Body('remark') remark: string,
    @Request() req,
  ) {
    return this.billLifecycleService.confirmPayment(billId, paidAmount, req.user.id, remark);
  }

  /**
   * 获取账单状态历史
   */
  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  async getStatusHistory(@Param('id') billId: string) {
    return this.billLifecycleService.getStatusHistory(billId);
  }

  /**
   * 添加账单明细
   */
  @Post(':id/items')
  @UseGuards(JwtAuthGuard)
  async addBillItem(
    @Param('id') billId: string,
    @Body() item: { itemCode: string; itemName: string; quantity: number; unit: string; unitPrice: number; remark?: string },
    @Request() req,
  ) {
    return this.billLifecycleService.addBillItem(billId, item, req.user.id);
  }

  /**
   * 更新账单明细
   */
  @Put(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async updateBillItem(
    @Param('id') billId: string,
    @Param('itemId') itemId: string,
    @Body() item: UpdateBillItemDto,
    @Request() req,
  ) {
    return this.billLifecycleService.updateBillItem(billId, itemId, item, req.user.id);
  }

  /**
   * 删除账单明细
   */
  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async deleteBillItem(
    @Param('id') billId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    return this.billLifecycleService.deleteBillItem(billId, itemId, req.user.id);
  }

  /**
   * 批量更新账单明细
   */
  @Put(':id/items')
  @UseGuards(JwtAuthGuard)
  async batchUpdateItems(
    @Param('id') billId: string,
    @Body('items') items: UpdateBillItemDto[],
    @Request() req,
  ) {
    return this.billLifecycleService.batchUpdateItems(billId, items, req.user.id);
  }

  /**
   * 获取所有账单状态定义
   */
  @Get('metadata/statuses')
  @UseGuards(JwtAuthGuard)
  getAllStatuses() {
    return Object.values(BillStatus).map(status => ({
      value: status,
      label: this.billLifecycleService.getStatusLabel(status),
    }));
  }

  /**
   * 获取所有账单类型定义
   */
  @Get('metadata/types')
  @UseGuards(JwtAuthGuard)
  getAllTypes() {
    return Object.values(BillType).map(type => ({
      value: type,
      label: this.billLifecycleService.getBillTypeLabel(type),
    }));
  }
}
