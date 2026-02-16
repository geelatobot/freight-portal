import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { FourPortunService } from './fourportun.service';

@Module({
  providers: [SyncService, FourPortunService],
  exports: [SyncService, FourPortunService],
})
export class SyncModule {}
