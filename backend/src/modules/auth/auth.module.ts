import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DataSanitizerService } from '../../common/utils/data-sanitizer.service';

@Module({
  providers: [
    AuthService,
    JwtAuthGuard,
    DataSanitizerService,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
