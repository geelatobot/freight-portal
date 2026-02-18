import { Controller, Post, Get, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrackingService } from './tracking.service';
import { BatchTrackDto } from './dto/batch-track.dto';
import { SubscribeShipmentDto } from './dto/subscribe-shipment.dto';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * 批量跟踪集装箱
   */
  @Post('batch')
  @UseGuards(JwtAuthGuard)
  async batchTrack(@Body() dto: BatchTrackDto, @Request() req) {
    const companyId = dto.companyId || req.user.defaultCompanyId;
    return this.trackingService.batchTrack(dto.containerNos, companyId);
  }

  /**
   * 获取货物跟踪历史
   */
  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  async getTrackingHistory(@Param('id') id: string) {
    return this.trackingService.getTrackingHistory(id);
  }

  /**
   * 订阅货物更新
   */
  @Post(':containerNo/subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribeShipment(
    @Param('containerNo') containerNo: string,
    @Body() dto: SubscribeShipmentDto,
    @Request() req,
  ) {
    return this.trackingService.subscribeShipment(containerNo, req.user.id, {
      email: dto.email,
      phone: dto.phone,
    });
  }
}
