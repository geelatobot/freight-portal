import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() chatDto: ChatDto, @Request() req) {
    return this.aiService.chat(
      chatDto.message,
      req.user.id,
      chatDto.companyId || req.user.defaultCompanyId,
    );
  }

  @Post('query-shipment')
  @UseGuards(JwtAuthGuard)
  async queryShipment(@Body('containerNo') containerNo: string, @Request() req) {
    return this.aiService.queryShipmentStatus(
      containerNo,
      req.user.defaultCompanyId,
    );
  }
}
