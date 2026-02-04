import { Module } from '@nestjs/common';

import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';

import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

import { SkusController } from './skus/skus.controller';
import { SkusService } from './skus/skus.service';

@Module({
  controllers: [CategoriesController, ProductsController, SkusController],
  providers: [CategoriesService, ProductsService, SkusService],
})
export class CatalogModule {}
