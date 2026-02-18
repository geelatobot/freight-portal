import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { CompanyVerificationService } from './company-verification.service';
import { CompanyVerificationController, CompanyVerificationAdminController } from './company-verification.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CustomerService, CompanyVerificationService],
  controllers: [CustomerController, CompanyVerificationController, CompanyVerificationAdminController],
  exports: [CustomerService, CompanyVerificationService],
})
export class CustomerModule {}
