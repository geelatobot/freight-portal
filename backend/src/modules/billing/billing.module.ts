import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillLifecycleService } from './bill-lifecycle.service';
import { BillLifecycleController } from './bill-lifecycle.controller';
import { AuthModule } from '../auth/auth.module';
import { CodeGeneratorService } from '../../common/utils/code-generator.service';

@Module({
  imports: [AuthModule],
  providers: [
    BillingService,
    BillLifecycleService,
    CodeGeneratorService,
  ],
  controllers: [BillingController, BillLifecycleController],
  exports: [BillingService, BillLifecycleService],
})
export class BillingModule {}
