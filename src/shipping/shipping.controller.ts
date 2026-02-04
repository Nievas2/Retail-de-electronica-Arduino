import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';

@ApiTags('Shipping')
@ApiBearerAuth()
@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // API.md:
  // POST /orders/:id/shipping
  @Post('orders/:orderId/shipping')
  async createForOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CreateShippingDto,
  ) {
    return this.shippingService.createForOrder(Number(orderId), dto);
  }

  // API.md:
  // PATCH /orders/:id/shipping
  @Patch('orders/:orderId/shipping')
  async updateForOrder(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateShippingDto,
  ) {
    return this.shippingService.updateForOrder(Number(orderId), dto);
  }
}
