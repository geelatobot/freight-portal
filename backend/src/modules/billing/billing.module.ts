import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillLifecycleService } from './bill-lifecycle.service';
import { BillLifecycleController } from './bill-lifecycle.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { PaymentVoucherService } from './payment-voucher.service';
import { PaymentVoucherController } from './payment-voucher.controller';
import { AuthModule } from '../auth/auth.module';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { WinstonLoggerService } from '../../common/logger/winston-logger.service';

@Module({
  imports: [AuthModule],
  providers: [
    BillingService,
    BillLifecycleService,
    InvoiceService,
    PaymentVoucherService,
    CodeGeneratorService,
    WinstonLoggerService,
  ],
  controllers: [
    BillingController,
    BillLifecycleController,
    InvoiceController,
    PaymentVoucherController,
  ],
  exports: [BillingService, BillLifecycleService, InvoiceService, PaymentVoucherService],
})
export class BillingModule {}
