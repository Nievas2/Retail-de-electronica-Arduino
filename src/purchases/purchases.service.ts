import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, PurchaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseStatusDto } from './dto/update-purchase-status.dto';

type PaginationResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePageLimit(page?: number, limit?: number) {
    const safePage = Number.isFinite(page as number) ? Number(page) : 1;
    const safeLimit = Number.isFinite(limit as number) ? Number(limit) : 20;

    return {
      page: Math.max(1, safePage),
      limit: Math.min(100, Math.max(1, safeLimit)),
    };
  }

  async create(dto: CreatePurchaseDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Purchase must contain at least 1 item');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier || !supplier.active) {
      throw new NotFoundException(`Supplier not found: ${dto.supplierId}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.createdById },
      include: { role: true },
    });
    if (!user || !user.active) {
      throw new NotFoundException(`User not found: ${dto.createdById}`);
    }

    // Validar SKUs
    const skuIds = dto.items.map((i) => i.skuId);
    const skus = await this.prisma.sku.findMany({
      where: { id: { in: skuIds }, active: true },
      select: { id: true },
    });
    const skuSet = new Set(skus.map((s) => s.id));
    const missingSku = skuIds.find((id) => !skuSet.has(id));
    if (missingSku) {
      throw new NotFoundException(`SKU not found: ${missingSku}`);
    }

    // Validaciones extra
    for (const it of dto.items) {
      if (it.quantity <= 0) {
        throw new BadRequestException('Quantity must be >= 1');
      }
      if (it.unitCost < 0) {
        throw new BadRequestException('Unit cost must be >= 0');
      }
    }

    const purchase = await this.prisma.purchase.create({
      data: {
        supplierId: dto.supplierId,
        createdById: dto.createdById,
        status: PurchaseStatus.REGISTRADA,
        notes: dto.notes?.trim() || null,
        items: {
          create: dto.items.map((it) => ({
            skuId: it.skuId,
            quantity: it.quantity,
            unitCost: new Prisma.Decimal(it.unitCost),
          })),
        },
      },
      include: {
        supplier: true,
        createdBy: { include: { role: true } },
        items: {
          include: {
            sku: {
              include: {
                product: { include: { category: true } },
              },
            },
          },
        },
      },
    });

    return purchase;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: PurchaseStatus;
    supplierId?: number;
  }): Promise<PaginationResult<any>> {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);

    const where: Prisma.PurchaseWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
    };

    const total = await this.prisma.purchase.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const purchases = await this.prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        createdBy: { include: { role: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: purchases, page, limit, total, totalPages };
  }

  async findOne(id: number) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { include: { role: true } },
        items: {
          include: {
            sku: {
              include: {
                product: { include: { category: true } },
              },
            },
          },
        },
        movements: true,
      },
    });

    if (!purchase) throw new NotFoundException(`Purchase not found: ${id}`);
    return purchase;
  }

  async updateStatus(id: number, dto: UpdatePurchaseStatusDto) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchase) throw new NotFoundException(`Purchase not found: ${id}`);

    // Reglas de transición (V1)
    // REGISTRADA -> RECIBIDA (genera ENTRADAS)
    // REGISTRADA -> ANULADA
    // RECIBIDA/ANULADA no cambian
    if (purchase.status !== PurchaseStatus.REGISTRADA) {
      throw new BadRequestException(
        `Purchase cannot change status from ${purchase.status}`,
      );
    }

    if (
      dto.status !== PurchaseStatus.RECIBIDA &&
      dto.status !== PurchaseStatus.ANULADA
    ) {
      throw new BadRequestException(
        `Invalid status transition to ${dto.status}`,
      );
    }

    if (dto.status === PurchaseStatus.RECIBIDA) {
      if (!purchase.items.length) {
        throw new BadRequestException('Cannot receive a purchase with 0 items');
      }

      // Transacción: actualizar estado + crear movimientos ENTRADA
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.purchase.update({
          where: { id },
          data: {
            status: PurchaseStatus.RECIBIDA,
            notes: dto.reason?.trim()
              ? `${purchase.notes ?? ''}\n[RECIBIDA] ${dto.reason.trim()}`
                  .trim()
              : purchase.notes,
          },
          include: {
            supplier: true,
            createdBy: { include: { role: true } },
            items: {
              include: {
                sku: {
                  include: {
                    product: { include: { category: true } },
                  },
                },
              },
            },
            movements: true,
          },
        });

        await tx.inventoryMovement.createMany({
          data: purchase.items.map((it) => ({
            skuId: it.skuId,
            type: MovementType.ENTRADA,
            quantity: it.quantity,
            reason: dto.reason?.trim() || 'Recepción de compra',
            purchaseId: purchase.id,
          })),
        });

        return updated;
      });

      return result;
    }

    // ANULADA (no crea movimientos)
    const updated = await this.prisma.purchase.update({
      where: { id },
      data: {
        status: PurchaseStatus.ANULADA,
        notes: dto.reason?.trim()
          ? `${purchase.notes ?? ''}\n[ANULADA] ${dto.reason.trim()}`
              .trim()
          : purchase.notes,
      },
      include: {
        supplier: true,
        createdBy: { include: { role: true } },
        items: {
          include: {
            sku: {
              include: {
                product: { include: { category: true } },
              },
            },
          },
        },
        movements: true,
      },
    });

    return updated;
  }
}
