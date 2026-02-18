/**
 * 内部系统控制器
 * 实现推送接口
 */

import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InternalService } from './internal.service';
import { PushContainersDto } from './dto/push-containers.dto';
import { UpdateSubscriptionDto, SubscriptionQueryDto } from './dto/update-subscription.dto';
import { PushStatus } from '@prisma/client';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  /**
   * 推送集装箱数据
   * POST /internal/push/containers
   */
  @Post('push/containers')
  @HttpCode(HttpStatus.OK)
  async pushContainers(@Body() dto: PushContainersDto) {
    return this.internalService.pushContainers(dto);
  }

  /**
   * 批量更新订阅
   * PUT /internal/subscriptions/batch
   */
  @Put('subscriptions/batch')
  @HttpCode(HttpStatus.OK)
  async updateSubscriptions(@Body() dto: UpdateSubscriptionDto) {
    return this.internalService.updateSubscriptions(dto);
  }

  /**
   * 查询订阅状态
   * GET /internal/subscriptions
   */
  @Get('subscriptions')
  async getSubscriptions(
    @Query('containerNo') containerNo?: string,
    @Query('companyId') companyId?: string,
    @Query('isSubscribed') isSubscribed?: string,
    @Query('externalSubscribed') externalSubscribed?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.internalService.getSubscriptions({
      containerNo,
      companyId,
      isSubscribed: isSubscribed !== undefined ? isSubscribed === 'true' : undefined,
      externalSubscribed: externalSubscribed !== undefined ? externalSubscribed === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  /**
   * 查询推送记录
   * GET /internal/push-records
   */
  @Get('push-records')
  async getPushRecords(
    @Query('containerNo') containerNo?: string,
    @Query('status') status?: PushStatus,
    @Query('source') source?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.internalService.getPushRecords({
      containerNo,
      status,
      source,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }
}
