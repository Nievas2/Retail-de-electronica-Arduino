import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

@Injectable()
export class SkusService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePageLimit(page?: number, limit?: number) {
    const safePage = Number.isFinite(page as number) ? Number(page) : 1;
    const safeLimit = Number.isFinite(limit as number) ? Number(limit) : 20;

    return {
      page: Math.max(1, safePage),
      limit: Math.min(100, Math.max(1, safeLimit)),
    };
  }

  private parseBool(value?: string) {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  async findAll(params: {
    search?: string;
    productId?: number;
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<Paginated<any>> {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);

    const search = params.search?.trim();
    const where: Prisma.SkuWhereInput = {
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.active !== undefined ? { active: params.active } : {}),
      ...(search
        ? {
            OR: [
              { skuCode: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { version: { contains: search, mode: 'insensitive' } },
              { voltage: { contains: search, mode: 'insensitive' } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const totalItems = await this.prisma.sku.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const items = await this.prisma.sku.findMany({
      where,
      include: {
        product: { include: { category: true } },
      },
      orderBy: { skuCode: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, page, limit, totalItems, totalPages };
  }

  async findOne(id: number) {
    const sku = await this.prisma.sku.findUnique({
      where: { id },
      include: { product: { include: { category: true } } },
    });
    if (!sku) throw new NotFoundException(`SKU not found: ${id}`);
    return sku;
  }

  async create(dto: CreateSkuDto) {
    const skuCode = dto.skuCode.trim();

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { category: true },
    });

    if (!product || !product.active || !product.category.active) {
      throw new NotFoundException(`Product not found: ${dto.productId}`);
    }

    try {
      return await this.prisma.sku.create({
        data: {
          productId: dto.productId,
          skuCode,
          brand: dto.brand?.trim() || null,
          version: dto.version?.trim() || null,
          isOriginal: dto.isOriginal ?? false,
          voltage: dto.voltage?.trim() || null,
          referencePrice:
            dto.referencePrice === undefined
              ? null
              : new Prisma.Decimal(dto.referencePrice),
        },
        include: { product: { include: { category: true } } },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(`SKU code already exists: ${skuCode}`);
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateSkuDto) {
    const existing = await this.prisma.sku.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`SKU not found: ${id}`);

    if (dto.productId !== undefined) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        include: { category: true },
      });
      if (!product || !product.active || !product.category.active) {
        throw new NotFoundException(`Product not found: ${dto.productId}`);
      }
    }

    const nextSkuCode = dto.skuCode?.trim();
    if (nextSkuCode !== undefined && nextSkuCode.length === 0) {
      throw new BadRequestException('skuCode cannot be empty');
    }

    try {
      return await this.prisma.sku.update({
        where: { id },
        data: {
          productId: dto.productId ?? undefined,
          skuCode: nextSkuCode ?? undefined,
          brand: dto.brand !== undefined ? dto.brand?.trim() || null : undefined,
          version:
            dto.version !== undefined ? dto.version?.trim() || null : undefined,
          isOriginal: dto.isOriginal ?? undefined,
          voltage:
            dto.voltage !== undefined ? dto.voltage?.trim() || null : undefined,
          referencePrice:
            dto.referencePrice === undefined
              ? undefined
              : new Prisma.Decimal(dto.referencePrice),
        },
        include: { product: { include: { category: true } } },
      });
    } catch (e: any) {
      if (e?.code === 'P2002' && nextSkuCode) {
        throw new ConflictException(`SKU code already exists: ${nextSkuCode}`);
      }
      throw e;
    }
  }

  async setActive(id: number, active: boolean) {
    const sku = await this.prisma.sku.findUnique({ where: { id } });
    if (!sku) throw new NotFoundException(`SKU not found: ${id}`);

    return this.prisma.sku.update({
      where: { id },
      data: { active },
      include: { product: { include: { category: true } } },
    });
  }
}
