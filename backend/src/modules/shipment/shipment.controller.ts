import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShipmentService } from './shipment.service';
import { TrackContainerDto } from './dto/track-container.dto';

@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  /**
   * 查询集装箱跟踪（公开接口，无需登录）
   */
  @Post('track')
  async trackContainer(@Body() dto: TrackContainerDto) {
    return this.shipmentService.trackContainer(dto.containerNo, dto.companyId);
  }

  /**
   * 根据提单号查询（公开接口）
   */
  @Get('track/bl')
  async trackByBlNo(@Query('blNo') blNo: string) {
    return this.shipmentService.trackByBlNo(blNo);
  }

  /**
   * 获取企业货物列表（需登录）
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getShipments(@Request() req, @Query() query) {
    // 从用户的企业列表中获取默认企业
    const companyId = query.companyId || req.user.defaultCompanyId;
    return this.shipmentService.getCompanyShipments(companyId, query);
  }

  /**
   * 获取货物详情（需登录）
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getShipmentDetail(@Param('id') id: string) {
    return this.shipmentService.getShipmentDetail(id);
  }
}
