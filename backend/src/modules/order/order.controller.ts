import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Request, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { Response } from 'express';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    // 从用户的企业列表中获取默认企业
    const companyId = req.user.defaultCompanyId || req.body.companyId;
    return this.orderService.create(req.user.id, companyId, createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: QueryOrderDto, @Request() req) {
    const companyId = req.query.companyId || req.user.defaultCompanyId;
    return this.orderService.findAll(companyId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    const companyId = req.user.role === 'ADMIN' ? undefined : req.user.defaultCompanyId;
    return this.orderService.findOne(id, companyId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto, @Request() req) {
    const companyId = req.user.defaultCompanyId;
    return this.orderService.update(id, companyId, updateOrderDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req) {
    const companyId = req.user.defaultCompanyId;
    return this.orderService.cancel(id, companyId);
  }

  /**
   * 导出订单（需登录）
   */
  @Get('export')
  @UseGuards(JwtAuthGuard)
  async exportOrders(@Query() query: QueryOrderDto, @Request() req, @Res() res: Response) {
    const companyId = req.user.defaultCompanyId;
    const csvData = await this.orderService.exportOrders(companyId, query);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
    res.send(csvData);
  }
}
