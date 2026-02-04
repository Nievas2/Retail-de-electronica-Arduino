import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderChannel, OrderStatus, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseDateOnlyUTC(value: string): Date {
  // acepta YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) throw new BadRequestException(`Invalid date format: ${value} (expected YYYY-MM-DD)`);

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }

  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
}

function toExclusiveEndUTC(to?: string): Date | undefined {
  if (!to) return undefined;
  const base = parseDateOnlyUTC(to);
  base.setUTCDate(base.getUTCDate() + 1); // día siguiente 00:00 UTC
  return base;
}

function dayKeyUTC(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateWhere(from?: string, to?: string) {
    const where: any = {};
    if (from) where.gte = parseDateOnlyUTC(from);
    const toEx = toExclusiveEndUTC(to);
    if (toEx) where.lt = toEx;
    return Object.keys(where).length ? where : undefined;
  }

  // ------------------------------------------------------------
  // SALES / DAILY
  // ------------------------------------------------------------
  async salesDaily(params: { from?: string; to?: string }) {
    const createdAt = this.buildDateWhere(params.from, params.to);

    const sales = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.CERRADA,
        ...(createdAt ? { createdAt } : {}),
      },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const byDay = new Map<
      string,
      { day: string; totalSales: number; itemsTotal: number; paidTotal: number }
    >();

    for (const s of sales) {
      const day = dayKeyUTC(s.createdAt);

      let itemsTotal = 0;
      for (const it of s.items) {
        itemsTotal += it.quantity * Number(it.unitPrice) - Number(it.discount);
      }

      let paidTotal = 0;
      for (const p of s.payments) {
        paidTotal += Number(p.amount);
      }

      const row = byDay.get(day) || {
        day,
        totalSales: 0,
        itemsTotal: 0,
        paidTotal: 0,
      };

      row.totalSales += 1;
      row.itemsTotal = round2(row.itemsTotal + itemsTotal);
      row.paidTotal = round2(row.paidTotal + paidTotal);

      byDay.set(day, row);
    }

    const items = Array.from(byDay.values()).sort((a, b) =>
      a.day < b.day ? 1 : -1,
    );

    return {
      from: params.from || null,
      to: params.to || null,
      items,
    };
  }

  // ------------------------------------------------------------
  // SALES / SUMMARY (por venta)
  // ------------------------------------------------------------
  async salesSummary(params: { from?: string; to?: string }) {
    const createdAt = this.buildDateWhere(params.from, params.to);

    const sales = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.CERRADA,
        ...(createdAt ? { createdAt } : {}),
      },
      include: {
        customer: true,
        items: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
        createdBy: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = sales.map((s) => {
      const itemsTotal = round2(
        s.items.reduce(
          (acc, it) =>
            acc + it.quantity * Number(it.unitPrice) - Number(it.discount),
          0,
        ),
      );

      const paidTotal = round2(
        s.payments.reduce((acc, p) => acc + Number(p.amount), 0),
      );

      return {
        saleId: s.id,
        createdAt: s.createdAt,
        status: s.status,
        customer: s.customer
          ? {
              id: s.customer.id,
              fullName: s.customer.fullName,
              phone: s.customer.phone,
              email: s.customer.email,
              cedulaRuc: s.customer.cedulaRuc,
            }
          : null,
        createdBy: s.createdBy,
        itemsTotal,
        paidTotal,
        balance: round2(itemsTotal - paidTotal),
        items: s.items.map((it) => ({
          id: it.id,
          skuId: it.skuId,
          skuCode: it.sku?.skuCode,
          productName: it.sku?.product?.name,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          discount: Number(it.discount),
          lineTotal: round2(it.quantity * Number(it.unitPrice) - Number(it.discount)),
        })),
      };
    });

    return {
      from: params.from || null,
      to: params.to || null,
      items,
    };
  }

  // ------------------------------------------------------------
  // SALES / TOP PRODUCTS
  // ------------------------------------------------------------
  async topProducts(params: {
    from?: string;
    to?: string;
    limit?: number;
    mode?: 'units' | 'money';
  }) {
    const createdAt = this.buildDateWhere(params.from, params.to);

    const limit = Number.isFinite(params.limit as number)
      ? Math.min(50, Math.max(1, Number(params.limit)))
      : 10;

    const mode = params.mode === 'money' ? 'money' : 'units';

    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          status: SaleStatus.CERRADA,
          ...(createdAt ? { createdAt } : {}),
        },
      },
      include: {
        sku: {
          include: { product: true },
        },
      },
    });

    const map = new Map<
      string,
      {
        productId: number;
        productName: string;
        skuId: number;
        skuCode: string;
        unitsSold: number;
        moneySold: number;
      }
    >();

    for (const it of items) {
      const sku = it.sku;
      const product = sku?.product;

      if (!sku || !product) continue;

      const key = `${product.id}:${sku.id}`;

      const units = it.quantity;
      const money = it.quantity * Number(it.unitPrice) - Number(it.discount);

      const row = map.get(key) || {
        productId: product.id,
        productName: product.name,
        skuId: sku.id,
        skuCode: sku.skuCode,
        unitsSold: 0,
        moneySold: 0,
      };

      row.unitsSold += units;
      row.moneySold = round2(row.moneySold + money);

      map.set(key, row);
    }

    const rows = Array.from(map.values()).sort((a, b) => {
      if (mode === 'money') return b.moneySold - a.moneySold;
      return b.unitsSold - a.unitsSold;
    });

    return {
      from: params.from || null,
      to: params.to || null,
      mode,
      limit,
      items: rows.slice(0, limit),
    };
  }

  // ------------------------------------------------------------
  // INVENTORY / LOW STOCK
  // ------------------------------------------------------------
  async lowStock(params: { threshold?: number }) {
    const threshold = Number.isFinite(params.threshold as number)
      ? Math.max(0, Number(params.threshold))
      : 2;

    const grouped = await this.prisma.inventoryMovement.groupBy({
      by: ['skuId'],
      _sum: { quantity: true },
    });

    const stockMap = new Map<number, number>();
    for (const g of grouped) {
      stockMap.set(g.skuId, g._sum.quantity ?? 0);
    }

    const skus = await this.prisma.sku.findMany({
      where: { active: true },
      include: { product: true },
      orderBy: { skuCode: 'asc' },
    });

    const items = skus
      .map((sk) => {
        const currentStock = stockMap.get(sk.id) ?? 0;
        return {
          skuId: sk.id,
          skuCode: sk.skuCode,
          productId: sk.productId,
          productName: sk.product?.name,
          currentStock,
        };
      })
      .filter((x) => x.currentStock <= threshold)
      .sort((a, b) => a.currentStock - b.currentStock);

    return {
      threshold,
      items,
    };
  }

  // ------------------------------------------------------------
  // CUSTOMERS / TOP
  // ------------------------------------------------------------
  async topCustomers(params: { from?: string; to?: string; limit?: number }) {
    const createdAt = this.buildDateWhere(params.from, params.to);

    const limit = Number.isFinite(params.limit as number)
      ? Math.min(50, Math.max(1, Number(params.limit)))
      : 10;

    const sales = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.CERRADA,
        customerId: { not: null },
        ...(createdAt ? { createdAt } : {}),
      },
      include: {
        customer: true,
        items: true,
      },
    });

    const map = new Map<
      number,
      {
        customerId: number;
        fullName: string;
        phone: string | null;
        totalSales: number;
        moneySpent: number;
      }
    >();

    for (const s of sales) {
      if (!s.customerId || !s.customer) continue;

      const itemsTotal = s.items.reduce(
        (acc, it) =>
          acc + it.quantity * Number(it.unitPrice) - Number(it.discount),
        0,
      );

      const row = map.get(s.customerId) || {
        customerId: s.customerId,
        fullName: s.customer.fullName,
        phone: s.customer.phone || null,
        totalSales: 0,
        moneySpent: 0,
      };

      row.totalSales += 1;
      row.moneySpent = round2(row.moneySpent + itemsTotal);

      map.set(s.customerId, row);
    }

    const items = Array.from(map.values())
      .sort((a, b) => b.moneySpent - a.moneySpent)
      .slice(0, limit);

    return {
      from: params.from || null,
      to: params.to || null,
      limit,
      items,
    };
  }

  // ------------------------------------------------------------
  // ORDERS / PENDING
  // ------------------------------------------------------------
  async pendingOrders(params: { channel?: OrderChannel }) {
    const channel =
      params.channel && Object.values(OrderChannel).includes(params.channel)
        ? params.channel
        : OrderChannel.WHATSAPP;

    const pendingStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMADO,
      OrderStatus.EMPACADO,
      OrderStatus.ENVIADO,
    ];

    const orders = await this.prisma.order.findMany({
      where: {
        channel,
        status: { in: pendingStatuses },
      },
      include: {
        customer: true,
        items: {
          include: {
            sku: { include: { product: true } },
          },
        },
        shipping: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      channel,
      statuses: pendingStatuses,
      total: orders.length,
      items: orders.map((o) => ({
        orderId: o.id,
        channel: o.channel,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        customer: o.customer
          ? {
              id: o.customer.id,
              fullName: o.customer.fullName,
              phone: o.customer.phone,
              email: o.customer.email,
            }
          : null,
        notes: o.notes || null,
        itemsCount: o.items.length,
        items: o.items.map((it) => ({
          id: it.id,
          skuId: it.skuId,
          skuCode: it.sku?.skuCode,
          productName: it.sku?.product?.name,
          quantity: it.quantity,
          estimatedPrice:
            it.estimatedPrice !== null && it.estimatedPrice !== undefined
              ? Number(it.estimatedPrice)
              : null,
        })),
        shipping: o.shipping
          ? {
              id: o.shipping.id,
              type: o.shipping.type,
              status: o.shipping.status,
              address: o.shipping.address,
              reference: o.shipping.reference,
              contact: o.shipping.contact,
            }
          : null,
      })),
    };
  }
}
