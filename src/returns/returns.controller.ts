import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // API.md:
  // POST /sales/:id/returns
  @Post('sales/:saleId/returns')
  async createForSale(
    @Param('saleId') saleId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.createForSale(Number(saleId), dto);
  }

  // API.md:
  // GET /sales/:id/returns
  @Get('sales/:saleId/returns')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listForSale(
    @Param('saleId') saleId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.returnsService.findBySale(Number(saleId), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // API.md:
  // GET /returns/:id
  @Get('returns/:id')
  async findOne(@Param('id') id: string) {
    return this.returnsService.findOne(Number(id));
  }
}
