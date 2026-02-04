import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderChannel, OrderStatus } from '@prisma/client';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /orders
  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  // GET /orders?status=&channel=&customerId=&page=&limit=
  @Get()
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'channel', required: false, enum: OrderChannel })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('status') status?: OrderStatus,
    @Query('channel') channel?: OrderChannel,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll({
      status,
      channel,
      customerId: customerId ? Number(customerId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // GET /orders/:id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(Number(id));
  }

  // PATCH /orders/:id (solo BORRADOR)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(Number(id), dto);
  }

  // PATCH /orders/:id/status
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(Number(id), dto);
  }

  // POST /orders/:id/items (solo BORRADOR)
  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto) {
    return this.ordersService.addItem(Number(id), dto);
  }

  // PATCH /orders/:id/items/:itemId (solo BORRADOR)
  @Patch(':id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(Number(id), Number(itemId), dto);
  }

  // DELETE /orders/:id/items/:itemId (solo BORRADOR)
  @Delete(':id/items/:itemId')
  async deleteItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.ordersService.deleteItem(Number(id), Number(itemId));
  }
}
