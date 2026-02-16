import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { CustomerModule } from './modules/customer/customer.module';
import { OrderModule } from './modules/order/order.module';
import { ShipmentModule } from './modules/shipment/shipment.module';
import { BillingModule } from './modules/billing/billing.module';
import { SyncModule } from './modules/sync/sync.module';
import { AiModule } from './modules/ai/ai.module';
import { NotifyModule } from './modules/notify/notify.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 限流模块
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1分钟
      limit: 100,  // 100次请求
    }]),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // 公共模块
    CommonModule,
    PrismaModule,

    // 业务模块
    AuthModule,
    CustomerModule,
    OrderModule,
    ShipmentModule,
    BillingModule,
    SyncModule,
    AiModule,
    NotifyModule,
    AdminModule,
  ],
})
export class AppModule {}
