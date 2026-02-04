import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkusService } from './skus.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';

@ApiTags('SKUs')
@ApiBearerAuth()
@Controller('skus')
export class SkusController {
  constructor(private readonly skusService: SkusService) {}

  // GET /skus?search=&productId=&active=&page=&limit=
  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'active', required: false, description: 'true/false' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('search') search?: string,
    @Query('productId') productId?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const activeBool =
      active === undefined ? undefined : active === 'true' ? true : active === 'false' ? false : undefined;

    return this.skusService.findAll({
      search,
      productId: productId ? Number(productId) : undefined,
      active: activeBool,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // GET /skus/:id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.skusService.findOne(Number(id));
  }

  // POST /skus
  @Post()
  async create(@Body() dto: CreateSkuDto) {
    return this.skusService.create(dto);
  }

  // PATCH /skus/:id
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSkuDto) {
    return this.skusService.update(Number(id), dto);
  }

  // PATCH /skus/:id/activate body: { "active": true/false }
  @Patch(':id/activate')
  async activate(@Param('id') id: string, @Body('active') active: boolean) {
    return this.skusService.setActive(Number(id), Boolean(active));
  }
}
