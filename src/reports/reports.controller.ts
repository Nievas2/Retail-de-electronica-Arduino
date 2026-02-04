import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GET /reports/sales/daily?from=&to=
  @Get('sales/daily')
  @Roles(RoleName.ADMIN, RoleName.VENDEDOR)
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  async salesDaily(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.salesDaily({ from, to });
  }

  // GET /reports/sales/summary?from=&to=
  @Get('sales/summary')
  @Roles(RoleName.ADMIN, RoleName.VENDEDOR)
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  async salesSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.salesSummary({ from, to });
  }

  // GET /reports/sales/top-products?from=&to=&limit=10&mode=units|money
  @Get('sales/top-products')
  @Roles(RoleName.ADMIN, RoleName.VENDEDOR)
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'limit', required: false, description: 'default 10' })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'units | money (default units)',
  })
  async topProducts(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('mode') mode?: 'units' | 'money',
  ) {
    return this.reportsService.topProducts({
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      mode,
    });
  }

  // GET /reports/inventory/low-stock?threshold=2
  @Get('inventory/low-stock')
  @Roles(RoleName.ADMIN, RoleName.BODEGA, RoleName.VENDEDOR)
  @ApiQuery({ name: 'threshold', required: false, description: 'default 2' })
  async lowStock(@Query('threshold') threshold?: string) {
    return this.reportsService.lowStock({
      threshold: threshold ? Number(threshold) : undefined,
    });
  }

  // GET /reports/customers/top?from=&to=&limit=10
  @Get('customers/top')
  @Roles(RoleName.ADMIN, RoleName.VENDEDOR)
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'limit', required: false, description: 'default 10' })
  async topCustomers(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.topCustomers({
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // GET /reports/orders/pending?channel=WHATSAPP
  @Get('orders/pending')
  @Roles(RoleName.ADMIN, RoleName.VENDEDOR, RoleName.BODEGA)
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'WHATSAPP | PRESENCIAL | WEB (default WHATSAPP)',
  })
  async pendingOrders(@Query('channel') channel?: string) {
    return this.reportsService.pendingOrders({
      channel: channel as any,
    });
  }
}
