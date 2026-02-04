import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

type PaginationResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePageLimit(page?: number, limit?: number) {
    const safePage = Number.isFinite(page as number) ? Number(page) : 1;
    const safeLimit = Number.isFinite(limit as number) ? Number(limit) : 20;

    return {
      page: Math.max(1, safePage),
      limit: Math.min(100, Math.max(1, safeLimit)),
    };
  }

  private parseDateOrThrow(value?: string, label = 'date') {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ${label}: ${value}`);
    }
    return d;
  }

  private signedQuantity(type: MovementType, quantity: number): number {
    switch (type) {
      case MovementType.ENTRADA:
        return +quantity;
      case MovementType.SALIDA:
        return -quantity;
      case MovementType.DEVOLUCION:
        return +quantity;
      case MovementType.AJUSTE:
        return quantity; // puede ser + o -
      default:
        return quantity;
    }
  }

  async getStock(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<
    PaginationResult<{
      skuId: number;
      skuCode: string;
      brand: string | null;
      version: string | null;
      isOriginal: boolean;
      referencePrice: string | null;
      product: {
        id: number;
        name: string;
        category: { id: number; name: string };
      };
      stock: number;
    }>
  > {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);
    const search = (params.search || '').trim();

    const whereSku: Prisma.SkuWhereInput = {
      active: true,
      product: {
        active: true,
        category: { active: true },
      },
      ...(search
        ? {
            OR: [
              { skuCode: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { version: { contains: search, mode: 'insensitive' } },
              {
                product: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
              {
                product: {
                  category: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const total = await this.prisma.sku.count({ where: whereSku });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const skus = await this.prisma.sku.findMany({
      where: whereSku,
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { skuCode: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const skuIds = skus.map((s) => s.id);

    const groups =
      skuIds.length > 0
        ? await this.prisma.inventoryMovement.groupBy({
            by: ['skuId', 'type'],
            where: { skuId: { in: skuIds } },
            _sum: { quantity: true },
          })
        : [];

    const stockMap = new Map<number, number>();
    for (const g of groups) {
      const sumQty = g._sum.quantity ?? 0;
      const signed = this.signedQuantity(g.type, sumQty);
      stockMap.set(g.skuId, (stockMap.get(g.skuId) ?? 0) + signed);
    }

    const items = skus.map((s) => ({
      skuId: s.id,
      skuCode: s.skuCode,
      brand: s.brand ?? null,
      version: s.version ?? null,
      isOriginal: s.isOriginal,
      referencePrice: s.referencePrice ? String(s.referencePrice) : null,
      product: {
        id: s.product.id,
        name: s.product.name,
        category: {
          id: s.product.category.id,
          name: s.product.category.name,
        },
      },
      stock: stockMap.get(s.id) ?? 0,
    }));

    return { items, page, limit, total, totalPages };
  }

  async listMovements(params: {
    skuId?: number;
    type?: MovementType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<
    PaginationResult<{
      id: number;
      skuId: number;
      type: MovementType;
      quantity: number;
      reason: string | null;
      purchaseId: number | null;
      saleId: number | null;
      returnId: number | null;
      createdAt: Date;
      sku: {
        id: number;
        skuCode: string;
        product: { id: number; name: string; category: { id: number; name: string } };
      };
    }>
  > {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);

    const fromDate = this.parseDateOrThrow(params.from, 'from');
    const toDate = this.parseDateOrThrow(params.to, 'to');

    const where: Prisma.InventoryMovementWhereInput = {
      ...(params.skuId ? { skuId: params.skuId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const total = await this.prisma.inventoryMovement.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const movements = await this.prisma.inventoryMovement.findMany({
      where,
      include: {
        sku: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = movements.map((m) => ({
      id: m.id,
      skuId: m.skuId,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason ?? null,
      purchaseId: m.purchaseId ?? null,
      saleId: m.saleId ?? null,
      returnId: m.returnId ?? null,
      createdAt: m.createdAt,
      sku: {
        id: m.sku.id,
        skuCode: m.sku.skuCode,
        product: {
          id: m.sku.product.id,
          name: m.sku.product.name,
          category: {
            id: m.sku.product.category.id,
            name: m.sku.product.category.name,
          },
        },
      },
    }));

    return { items, page, limit, total, totalPages };
  }

  async createAdjustment(dto: CreateAdjustmentDto) {
    const sku = await this.prisma.sku.findUnique({
      where: { id: dto.skuId },
      include: {
        product: { include: { category: true } },
      },
    });

    if (!sku || !sku.active || !sku.product.active || !sku.product.category.active) {
      throw new NotFoundException(`SKU not found: ${dto.skuId}`);
    }

    if (dto.quantity === 0) {
      throw new BadRequestException('Adjustment quantity cannot be 0');
    }

    const movement = await this.prisma.inventoryMovement.create({
      data: {
        skuId: dto.skuId,
        type: MovementType.AJUSTE,
        quantity: dto.quantity,
        reason: dto.reason?.trim() || null,
      },
      include: {
        sku: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });

    return {
      id: movement.id,
      skuId: movement.skuId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason ?? null,
      purchaseId: movement.purchaseId ?? null,
      saleId: movement.saleId ?? null,
      returnId: movement.returnId ?? null,
      createdAt: movement.createdAt,
      sku: {
        id: movement.sku.id,
        skuCode: movement.sku.skuCode,
        product: {
          id: movement.sku.product.id,
          name: movement.sku.product.name,
          category: {
            id: movement.sku.product.category.id,
            name: movement.sku.product.category.name,
          },
        },
      },
    };
  }
}
