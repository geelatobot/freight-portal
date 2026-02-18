/**
 * 任务 1.2.1: FourPortunService 完整实现 - Webhook 控制器
 */

import { 
  Controller, 
  Post, 
  Body, 
  Headers, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { WinstonLoggerService } from '../../../common/logger/winston-logger.service';
import { FourPortunService } from '../services/fourportun.service';
import { SyncService } from '../services/sync.service';
import { WebhookPayloadDto } from '../dto/fourportun.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly fourPortunService: FourPortunService,
    private readonly syncService: SyncService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext('WebhookController');
  }

  /**
   * 接收 4Portun Webhook 推送
   * POST /webhooks/4portun
   */
  @Post('4portun')
  @HttpCode(HttpStatus.OK)
  async handleFourPortunWebhook(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-4portun-signature') signature: string,
    @Headers('x-4portun-timestamp') timestamp: string,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    this.logger.log(`Received 4Portun webhook for container: ${payload.containerNo}`);

    try {
      // 验证签名
      const isValid = this.fourPortunService.verifyWebhookSignature(
        payload,
        signature,
        timestamp,
      );

      if (!isValid) {
        this.logger.warn(`Invalid webhook signature for container: ${payload.containerNo}`);
        throw new UnauthorizedException('Invalid signature');
      }

      // 处理 Webhook 数据
      const processedData = this.fourPortunService.processWebhookPayload(payload);

      // 同步到数据库
      const result = await this.syncService.syncFromWebhook(processedData);

      this.logger.log(`Webhook processed successfully for container: ${payload.containerNo}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        data: {
          containerNo: result.containerNo,
          eventCount: result.eventCount,
          updatedAt: result.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to process webhook for container: ${payload.containerNo}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
