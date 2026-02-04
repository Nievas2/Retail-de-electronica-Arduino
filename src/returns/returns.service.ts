import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, ReturnCondition, SaleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';

type PaginationResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePageLimit(page?: number, limit?: number) {
    const safePage = Number.isFinite(page as number) ? Number(page) : 1;
    const safeLimit = Number.isFinite(limit as number) ? Number(limit) : 20;

    return {
      page: Math.max(1, safePage),
      limit: Math.min(100, Math.max(1, safeLimit)),
    };
  }

  private mergeItems(dtoItems: CreateReturnDto['items']) {
    const map = new Map<number, { skuId: number; quantity: number; condition: ReturnCondition }>();

    for (const it of dtoItems) {
      if (it.quantity <= 0) {
        throw new BadRequestException('Quantity must be >= 1');
      }

      const condition = it.condition ?? ReturnCondition.NUEVO;

      const prev = map.get(it.skuId);
      if (!prev) {
        map.set(it.skuId, {
          skuId: it.skuId,
          quantity: it.quantity,
          condition,
        });
        continue;
      }

      // Si repiten SKU, se suman cantidades (RB-10)
      // Si condición difiere, lo tratamos como error para no mezclar “estado”
      if (prev.condition !== condition) {
        throw new BadRequestException(
          `SKU ${it.skuId} repeated with different condition. Combine it manually.`,
        );
      }

      prev.quantity += it.quantity;
      map.set(it.skuId, prev);
    }

    return [...map.values()];
  }

  async createForSale(saleId: number, dto: CreateReturnDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Return must contain at least 1 item');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.createdById },
      include: { role: true },
    });
    if (!user || !user.active) {
      throw new NotFoundException(`User not found: ${dto.createdById}`);
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        returns: { include: { items: true } },
      },
    });

    if (!sale) throw new NotFoundException(`Sale not found: ${saleId}`);

    // UC-15: devolución asociada a venta CERRADA
    if (sale.status !== SaleStatus.CERRADA) {
      throw new BadRequestException('Returns are only allowed for closed sales');
    }

    const itemsMerged = this.mergeItems(dto.items);

    // Mapa de cantidad vendida por SKU
    const soldMap = new Map<number, number>();
    for (const it of sale.items) {
      soldMap.set(it.skuId, (soldMap.get(it.skuId) ?? 0) + it.quantity);
    }

    // Mapa de cantidad ya devuelta por SKU (para esta venta)
    const returnedGroups = await this.prisma.returnItem.groupBy({
      by: ['skuId'],
      where: {
        return: { saleId },
      },
      _sum: { quantity: true },
    });

    const returnedMap = new Map<number, number>();
    for (const g of returnedGroups) {
      returnedMap.set(g.skuId, g._sum.quantity ?? 0);
    }

    // Validar que los SKUs existan y pertenezcan a la venta
    const skuIds = itemsMerged.map((i) => i.skuId);

    // Debe pertenecer a la venta
    const notInSale = skuIds.find((id) => !soldMap.has(id));
    if (notInSale) {
      throw new BadRequestException(
        `SKU ${notInSale} does not belong to sale ${saleId}`,
      );
    }

    // Validar no exceder lo vendido (considerando devoluciones previas)
    for (const it of itemsMerged) {
      const soldQty = soldMap.get(it.skuId) ?? 0;
      const alreadyReturned = returnedMap.get(it.skuId) ?? 0;
      const newTotalReturned = alreadyReturned + it.quantity;

      if (newTotalReturned > soldQty) {
        throw new BadRequestException(
          `Return exceeds sold quantity for skuId=${it.skuId}. Sold=${soldQty}, alreadyReturned=${alreadyReturned}, tryingToReturn=${it.quantity}`,
        );
      }
    }

    // Validar SKU activo (y producto/categoría activos)
    const skus = await this.prisma.sku.findMany({
      where: {
        id: { in: skuIds },
        active: true,
        product: { active: true, category: { active: true } },
      },
      select: { id: true },
    });

    const skuSet = new Set(skus.map((s) => s.id));
    const missingSku = skuIds.find((id) => !skuSet.has(id));
    if (missingSku) {
      throw new NotFoundException(`SKU not found or inactive: ${missingSku}`);
    }

    // Transacción: crear devolución + items + movimientos DEVOLUCION
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productReturn.create({
        data: {
          saleId,
          createdById: dto.createdById,
          reason: dto.reason?.trim() || null,
          items: {
            create: itemsMerged.map((it) => ({
              skuId: it.skuId,
              quantity: it.quantity,
              condition: it.condition ?? ReturnCondition.NUEVO,
            })),
          },
        },
        include: {
          sale: true,
          createdBy: { include: { role: true } },
          items: {
            include: {
              sku: {
                include: { product: { include: { category: true } } },
              },
            },
          },
          movements: true,
        },
      });

      await tx.inventoryMovement.createMany({
        data: itemsMerged.map((it) => ({
          skuId: it.skuId,
          type: MovementType.DEVOLUCION,
          quantity: it.quantity, // positivo (tipo define signo)
          reason: dto.reason?.trim() || 'Devolución de cliente',
          returnId: created.id,
        })),
      });

      // Re-leer con movimientos ya creados
      const final = await tx.productReturn.findUnique({
        where: { id: created.id },
        include: {
          sale: true,
          createdBy: { include: { role: true } },
          items: {
            include: {
              sku: {
                include: { product: { include: { category: true } } },
              },
            },
          },
          movements: true,
        },
      });

      return final;
    });

    return result;
  }

  async findBySale(
    saleId: number,
    params?: { page?: number; limit?: number },
  ): Promise<PaginationResult<any>> {
    const { page, limit } = this.normalizePageLimit(params?.page, params?.limit);

    const sale = await this.prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new NotFoundException(`Sale not found: ${saleId}`);

    const where: Prisma.ProductReturnWhereInput = { saleId };

    const total = await this.prisma.productReturn.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const returns = await this.prisma.productReturn.findMany({
      where,
      include: {
        createdBy: { include: { role: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: returns, page, limit, total, totalPages };
  }

  async findOne(returnId: number) {
    const ret = await this.prisma.productReturn.findUnique({
      where: { id: returnId },
      include: {
        sale: true,
        createdBy: { include: { role: true } },
        items: {
          include: {
            sku: {
              include: { product: { include: { category: true } } },
            },
          },
        },
        movements: true,
      },
    });

    if (!ret) throw new NotFoundException(`Return not found: ${returnId}`);
    return ret;
  }
}
