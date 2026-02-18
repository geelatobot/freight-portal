/**
 * 任务 1.2.1 & 1.2.3: FourPortunService 完整实现 & 同步策略实现
 * 同步模块
 */

import { Module } from '@nestjs/common';
import { FourPortunService } from './services/fourportun.service';
import { SyncService } from './services/sync.service';
import { SubscriptionService } from './services/subscription.service';
import { WebhookController } from './controllers/webhook.controller';

@Module({
  controllers: [WebhookController],
  providers: [FourPortunService, SyncService, SubscriptionService],
  exports: [FourPortunService, SyncService, SubscriptionService],
})
export class SyncModule {}
