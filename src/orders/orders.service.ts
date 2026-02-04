import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, OrderChannel, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

type PaginationResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePageLimit(page?: number, limit?: number) {
    const safePage = Number.isFinite(page as number) ? Number(page) : 1;
    const safeLimit = Number.isFinite(limit as number) ? Number(limit) : 20;

    return {
      page: Math.max(1, safePage),
      limit: Math.min(100, Math.max(1, safeLimit)),
    };
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
        return quantity;
      default:
        return quantity;
    }
  }

  private async computeStockMapForSkus(skuIds: number[]) {
    const stockMap = new Map<number, number>();
    if (!skuIds.length) return stockMap;

    const groups = await this.prisma.inventoryMovement.groupBy({
      by: ['skuId', 'type'],
      where: { skuId: { in: skuIds } },
      _sum: { quantity: true },
    });

    for (const g of groups) {
      const sumQty = g._sum.quantity ?? 0;
      const signed = this.signedQuantity(g.type, sumQty);
      stockMap.set(g.skuId, (stockMap.get(g.skuId) ?? 0) + signed);
    }

    return stockMap;
  }

  /**
   * Reserva lógica (D4):
   * Pedidos en CONFIRMADO / EMPACADO / ENVIADO cuentan como reservados,
   * mientras NO tengan una venta asociada (order.sale == null).
   */
  private async computeReservedMapForSkus(
    skuIds: number[],
    excludeOrderId?: number,
  ) {
    const reservedMap = new Map<number, number>();
    if (!skuIds.length) return reservedMap;

    const reservedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMADO,
      OrderStatus.EMPACADO,
      OrderStatus.ENVIADO,
    ];

    const groups = await this.prisma.orderItem.groupBy({
      by: ['skuId'],
      where: {
        skuId: { in: skuIds },
        order: {
          status: { in: reservedStatuses },
          ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
          sale: { is: null }, // evita doble-reserva si ya generó venta
        },
      },
      _sum: { quantity: true },
    });

    for (const g of groups) {
      reservedMap.set(g.skuId, g._sum.quantity ?? 0);
    }

    return reservedMap;
  }

  private assertOrderEditable(orderStatus: OrderStatus) {
    // RB-05: solo BORRADOR se edita libremente
    if (orderStatus !== OrderStatus.BORRADOR) {
      throw new BadRequestException('Order can only be edited in BORRADOR');
    }
  }

  async create(dto: CreateOrderDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || !customer.active) {
        throw new NotFoundException(`Customer not found: ${dto.customerId}`);
      }
    }

    const order = await this.prisma.order.create({
      data: {
        customerId: dto.customerId ?? null,
        channel: dto.channel ?? OrderChannel.WHATSAPP,
        status: OrderStatus.BORRADOR,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: true,
        items: {
          include: {
            sku: { include: { product: { include: { category: true } } } },
          },
        },
        shipping: true,
        sale: true,
      },
    });

    return order;
  }

  async findAll(params: {
    status?: OrderStatus;
    channel?: OrderChannel;
    customerId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginationResult<any>> {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);

    const where: Prisma.OrderWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.channel ? { channel: params.channel } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
    };

    const total = await this.prisma.order.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: true,
        shipping: true,
        sale: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: orders, page, limit, total, totalPages };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        shipping: true,
        sale: true,
        items: {
          include: {
            sku: { include: { product: { include: { category: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    return order;
  }

  async update(id: number, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order not found: ${id}`);

    this.assertOrderEditable(order.status);

    if (dto.customerId !== undefined && dto.customerId !== null) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || !customer.active) {
        throw new NotFoundException(`Customer not found: ${dto.customerId}`);
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        customerId:
          dto.customerId === undefined ? order.customerId : dto.customerId,
        channel: dto.channel ?? order.channel,
        notes: dto.notes?.trim() ?? order.notes,
      },
      include: {
        customer: true,
        shipping: true,
        sale: true,
        items: {
          include: {
            sku: { include: { product: { include: { category: true } } } },
          },
        },
      },
    });

    return updated;
  }

  async addItem(orderId: number, dto: AddOrderItemDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    this.assertOrderEditable(order.status);

    const sku = await this.prisma.sku.findUnique({
      where: { id: dto.skuId },
      include: { product: { include: { category: true } } },
    });

    if (
      !sku ||
      !sku.active ||
      !sku.product.active ||
      !sku.product.category.active
    ) {
      throw new NotFoundException(`SKU not found: ${dto.skuId}`);
    }

    // RB-10: no repetir SKU -> si ya existe, sumar cantidad
    const existing = order.items.find((i) => i.skuId === dto.skuId);

    if (!existing) {
      await this.prisma.orderItem.create({
        data: {
          orderId,
          skuId: dto.skuId,
          quantity: dto.quantity,
          estimatedPrice:
            dto.estimatedPrice === undefined
              ? null
              : new Prisma.Decimal(dto.estimatedPrice),
        },
      });

      return this.findOne(orderId);
    }

    // Si estimatedPrice viene y hay conflicto, se evita mezclar
    if (
      dto.estimatedPrice !== undefined &&
      existing.estimatedPrice !== null &&
      Number(existing.estimatedPrice) !== dto.estimatedPrice
    ) {
      throw new BadRequestException(
        'SKU already exists with different estimatedPrice. Update the item instead.',
      );
    }

    await this.prisma.orderItem.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + dto.quantity,
        estimatedPrice:
          dto.estimatedPrice === undefined
            ? existing.estimatedPrice
            : new Prisma.Decimal(dto.estimatedPrice),
      },
    });

    return this.findOne(orderId);
  }

  async updateItem(orderId: number, itemId: number, dto: UpdateOrderItemDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    this.assertOrderEditable(order.status);

    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.orderId !== orderId) {
      throw new NotFoundException(`OrderItem not found: ${itemId}`);
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity ?? item.quantity,
        estimatedPrice:
          dto.estimatedPrice === undefined
            ? item.estimatedPrice
            : new Prisma.Decimal(dto.estimatedPrice),
      },
    });

    return this.findOne(orderId);
  }

  async deleteItem(orderId: number, itemId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    this.assertOrderEditable(order.status);

    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.orderId !== orderId) {
      throw new NotFoundException(`OrderItem not found: ${itemId}`);
    }

    await this.prisma.orderItem.delete({ where: { id: itemId } });

    return this.findOne(orderId);
  }

  async updateStatus(orderId: number, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, sale: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    const current = order.status;
    const next = dto.status;

    // Reglas de transición (V1)
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.BORRADOR]: [OrderStatus.CONFIRMADO, OrderStatus.CANCELADO],
      [OrderStatus.CONFIRMADO]: [OrderStatus.EMPACADO, OrderStatus.CANCELADO],
      [OrderStatus.EMPACADO]: [OrderStatus.ENVIADO, OrderStatus.CANCELADO],
      [OrderStatus.ENVIADO]: [OrderStatus.ENTREGADO],
      [OrderStatus.ENTREGADO]: [],
      [OrderStatus.CANCELADO]: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Invalid transition: ${current} -> ${next}`,
      );
    }

    // Para confirmar: debe tener items
    if (next === OrderStatus.CONFIRMADO) {
      if (!order.items.length) {
        throw new BadRequestException('Cannot confirm an order with 0 items');
      }

      // Reserva lógica (D4):
      // disponible = stockReal - reservadoPorOtrosPedidos
      const skuIds = order.items.map((i) => i.skuId);
      const stockMap = await this.computeStockMapForSkus(skuIds);

      // Reservas excluyendo este pedido (todavía está BORRADOR)
      const reservedMap = await this.computeReservedMapForSkus(
        skuIds,
        order.id,
      );

      for (const it of order.items) {
        const stock = stockMap.get(it.skuId) ?? 0;
        const reserved = reservedMap.get(it.skuId) ?? 0;
        const available = stock - reserved;

        if (available < it.quantity) {
          throw new BadRequestException(
            `Insufficient available stock for skuId=${it.skuId}. Stock=${stock}, reserved=${reserved}, available=${available}, required=${it.quantity}`,
          );
        }
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: next,
        notes: dto.reason?.trim()
          ? `${order.notes ?? ''}\n[${next}] ${dto.reason.trim()}`.trim()
          : order.notes,
      },
      include: {
        customer: true,
        shipping: true,
        sale: true,
        items: {
          include: {
            sku: { include: { product: { include: { category: true } } } },
          },
        },
      },
    });

    return updated;
  }
}
