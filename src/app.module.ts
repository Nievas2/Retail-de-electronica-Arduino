import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './common/logger/logger.module';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';

import { CatalogModule } from './catalog/catalog.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';

import { InventoryModule } from './inventory/inventory.module';

import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';

import { OrdersModule } from './orders/orders.module';
import { ShippingModule } from './shipping/shipping.module';

import { ReturnsModule } from './returns/returns.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    LoggerModule,
    PrismaModule,

    HealthModule,
    AuthModule,

    UsersModule,
    RolesModule,

    CatalogModule,
    CustomersModule,
    SuppliersModule,

    InventoryModule,

    PurchasesModule,
    SalesModule,

    OrdersModule,
    ShippingModule,

    ReturnsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
