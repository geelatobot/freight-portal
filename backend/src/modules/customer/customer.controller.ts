import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.customerService.getProfile(req.user.id);
  }

  @Get('companies')
  @UseGuards(JwtAuthGuard)
  async getCompanies(@Request() req) {
    return this.customerService.getCompanies(req.user.id);
  }
}
