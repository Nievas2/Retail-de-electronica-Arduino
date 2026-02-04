import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MovementType,
  Prisma,
  SaleStatus,
  PaymentMethod,
  PrismaClient,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { AddPaymentDto } from './dto/add-payment.dto';

type PaginationResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class SalesService {
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
        return quantity; // +/- ya viene con signo
      default:
        return quantity;
    }
  }

  private mergeItems(dtoItems: CreateSaleDto['items']) {
    const map = new Map<
      number,
      { skuId: number; quantity: number; unitPrice: number; discount: number }
    >();

    for (const it of dtoItems) {
      const discount = it.discount ?? 0;

      if (it.quantity <= 0) throw new BadRequestException('Quantity must be >= 1');
      if (it.unitPrice < 0) throw new BadRequestException('Unit price must be >= 0');
      if (discount < 0) throw new BadRequestException('Discount must be >= 0');

      const prev = map.get(it.skuId);
      if (!prev) {
        map.set(it.skuId, {
          skuId: it.skuId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount,
        });
        continue;
      }

      // Regla RB-10: no duplicar SKUs -> se suman cantidades
      // Si el precio difiere, no podemos “mezclar” líneas con distinta tarifa.
      if (prev.unitPrice !== it.unitPrice) {
        throw new BadRequestException(
          `SKU ${it.skuId} repeated with different unitPrice. Combine it manually.`,
        );
      }

      prev.quantity += it.quantity;
      prev.discount += discount;
      map.set(it.skuId, prev);
    }

    return [...map.values()];
  }

  private async computeStockMapForSkus(skuIds: number[]) {
    if (skuIds.length === 0) return new Map<number, number>();

    const groups = await this.prisma.inventoryMovement.groupBy({
      by: ['skuId', 'type'],
      where: { skuId: { in: skuIds } },
      _sum: { quantity: true },
    });

    const stockMap = new Map<number, number>();
    for (const g of groups) {
      const sumQty = g._sum.quantity ?? 0;
      const signed = this.signedQuantity(g.type, sumQty);
      stockMap.set(g.skuId, (stockMap.get(g.skuId) ?? 0) + signed);
    }
    return stockMap;
  }

  async create(dto: CreateSaleDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Sale must contain at least 1 item');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.createdById },
      include: { role: true },
    });
    if (!user || !user.active) {
      throw new NotFoundException(`User not found: ${dto.createdById}`);
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || !customer.active) {
        throw new NotFoundException(`Customer not found: ${dto.customerId}`);
      }
    }

    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { sale: true },
      });
      if (!order) throw new NotFoundException(`Order not found: ${dto.orderId}`);
      if (order.sale) {
        throw new BadRequestException(
          `Order ${dto.orderId} already has a sale`,
        );
      }
    }

    const itemsMerged = this.mergeItems(dto.items);

    // Validar SKUs
    const skuIds = itemsMerged.map((i) => i.skuId);
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
      throw new NotFoundException(`SKU not found: ${missingSku}`);
    }

    const sale = await this.prisma.sale.create({
      data: {
        customerId: dto.customerId ?? null,
        orderId: dto.orderId ?? null,
        createdById: dto.createdById,
        status: SaleStatus.ABIERTA,
        notes: dto.notes?.trim() || null,
        items: {
          create: itemsMerged.map((it) => ({
            skuId: it.skuId,
            quantity: it.quantity,
            unitPrice: new Prisma.Decimal(it.unitPrice),
            discount: new Prisma.Decimal(it.discount ?? 0),
          })),
        },
      },
      include: {
        customer: true,
        order: true,
        createdBy: { include: { role: true } },
        items: {
          include: {
            sku: {
              include: { product: { include: { category: true } } },
            },
          },
        },
        payments: true,
        movements: true,
      },
    });

    return sale;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: SaleStatus;
    from?: string;
    to?: string;
  }): Promise<PaginationResult<any>> {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);

    const fromDate = this.parseDateOrThrow(params.from, 'from');
    const toDate = this.parseDateOrThrow(params.to, 'to');

    const where: Prisma.SaleWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const total = await this.prisma.sale.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        customer: true,
        order: true,
        createdBy: { include: { role: true } },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: sales, page, limit, total, totalPages };
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        createdBy: { include: { role: true } },
        items: {
          include: {
            sku: {
              include: { product: { include: { category: true } } },
            },
          },
        },
        payments: true,
        movements: true,
        returns: true,
      },
    });

    if (!sale) throw new NotFoundException(`Sale not found: ${id}`);
    return sale;
  }

  async updateStatus(id: number, dto: UpdateSaleStatusDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true, movements: true },
    });

    if (!sale) throw new NotFoundException(`Sale not found: ${id}`);

    // Solo ABIERTA -> CERRADA
    if (sale.status !== SaleStatus.ABIERTA) {
      throw new BadRequestException(
        `Sale cannot change status from ${sale.status}`,
      );
    }
    if (dto.status !== SaleStatus.CERRADA) {
      throw new BadRequestException(
        `Invalid status transition to ${dto.status}`,
      );
    }

    if (!sale.items.length) {
      throw new BadRequestException('Cannot close a sale with 0 items');
    }

    // Evitar doble salida por movimientos ya existentes
    if (sale.movements?.length) {
      throw new BadRequestException('Sale already has inventory movements');
    }

    const skuIds = sale.items.map((it) => it.skuId);
    const stockMap = await this.computeStockMapForSkus(skuIds);

    // RB-01: no cerrar si no hay stock suficiente
    for (const it of sale.items) {
      const stock = stockMap.get(it.skuId) ?? 0;
      if (stock < it.quantity) {
        throw new BadRequestException(
          `Insufficient stock for skuId=${it.skuId}. Stock=${stock}, required=${it.quantity}`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CERRADA,
          notes: dto.reason?.trim()
            ? `${sale.notes ?? ''}\n[CERRADA] ${dto.reason.trim()}`.trim()
            : sale.notes,
        },
        include: {
          customer: true,
          order: true,
          createdBy: { include: { role: true } },
          items: {
            include: {
              sku: { include: { product: { include: { category: true } } } },
            },
          },
          payments: true,
          movements: true,
        },
      });

      await tx.inventoryMovement.createMany({
        data: sale.items.map((it) => ({
          skuId: it.skuId,
          type: MovementType.SALIDA,
          quantity: it.quantity, // positivo, el tipo define el signo
          reason: dto.reason?.trim() || 'Venta cerrada',
          saleId: sale.id,
        })),
      });

      return updated;
    });

    return result;
  }

  async addPayment(saleId: number, dto: AddPaymentDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true },
    });

    if (!sale) throw new NotFoundException(`Sale not found: ${saleId}`);

    if (dto.amount < 0) {
      throw new BadRequestException('Payment amount must be >= 0'
