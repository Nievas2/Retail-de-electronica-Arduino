import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

// Nota:
// Más adelante, cuando completemos Auth + RBAC,
// aquí activamos guards y roles por endpoint.
// (UC-04: ADMIN/VENDEDOR/BODEGA) (UC-07: ADMIN/BODEGA)

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getStock(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getStock({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('movements')
  @ApiQuery({ name: 'skuId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: MovementType })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listMovements(
    @Query('skuId') skuId?: string,
    @Query('type') type?: MovementType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.listMovements({
      skuId: skuId ? Number(skuId) : undefined,
      type,
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('adjustments')
  async createAdjustment(@Body() dto: CreateAdjustmentDto) {
    return this.inventoryService.createAdjustment(dto);
  }
}
