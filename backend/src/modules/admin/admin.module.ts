import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { BillingModule } from '../billing/billing.module';
import { CustomerModule } from '../customer/customer.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [AuthModule, OrderModule, BillingModule, CustomerModule, PrismaModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
