import { Controller, Post, Patch, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  async create(
    @Body() body: CreateOrderDto
  ) {
    return this.ordersService.createOrder(
      body.tableId,
      body.items,
      body.specialInstructions
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.ordersService.updateOrderStatus(id, body.status, user?.role);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getActive(@Req() req: Request) {
    const user = req.user as any;
    const restaurantId = user?.restaurantId;
    return this.ordersService.getActiveOrders(restaurantId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Req() req: Request) {
    const user = req.user as any;
    const restaurantId = user?.restaurantId;
    return this.ordersService.getDashboardStats(restaurantId);
  }

  @Get('completed')
  @UseGuards(JwtAuthGuard)
  async getCompleted(@Req() req: Request) {
    const user = req.user as any;
    const restaurantId = user?.restaurantId;
    return this.ordersService.getCompletedOrdersToday(restaurantId);
  }
}
