import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, ShippingStatus, ShippingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOrderAllowsShipping(orderStatus: OrderStatus) {
    if (orderStatus === OrderStatus.CANCELADO) {
      throw new BadRequestException('Cannot manage shipping for canceled orders');
    }
    if (orderStatus === OrderStatus.ENTREGADO) {
      throw new BadRequestException(
        'Cannot manage shipping for delivered orders',
      );
    }
  }

  private validateAddressRule(type: ShippingType, address?: string | null) {
    // UC-04: RETIRO no requiere dirección; ENVIO sí requiere.
    if (type === ShippingType.ENVIO) {
      const addr = (address ?? '').trim();
      if (!addr) {
        throw new BadRequestException(
          'Address is required when shipping type is ENVIO',
        );
      }
    }
  }

  private validateStatusTransition(
    current: ShippingStatus,
    next: ShippingStatus,
  ) {
    const allowed: Record<ShippingStatus, ShippingStatus[]> = {
      [ShippingStatus.PENDIENTE]: [ShippingStatus.EN_RUTA],
      [ShippingStatus.EN_RUTA]: [ShippingStatus.ENTREGADO],
      [ShippingStatus.ENTREGADO]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Invalid shipping status transition: ${current} -> ${next}`,
      );
    }
  }

  async createForOrder(orderId: number, dto: CreateShippingDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipping: true, customer: true, items: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    this.assertOrderAllowsShipping(order.status);

    if (order.shipping) {
      throw new BadRequestException('Shipping already exists for this order');
    }

    const type = dto.type ?? ShippingType.ENVIO;

    this.validateAddressRule(type, dto.address ?? null);

    const shipping = await this.prisma.shipping.create({
      data: {
        orderId,
        type,
        // status default = PENDIENTE
        address: dto.address?.trim() || null,
        reference: dto.reference?.trim() || null,
        contact: dto.contact?.trim() || null,
      },
      include: {
        order: {
          include: {
            customer: true,
            items: true,
          },
        },
      },
    });

    return shipping;
  }

  async updateForOrder(orderId: number, dto: UpdateShippingDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipping: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    this.assertOrderAllowsShipping(order.status);

    if (!order.shipping) {
      throw new NotFoundException('Shipping not found for this order');
    }

    const currentShipping = order.shipping;

    // Validar transición de estado si viene en DTO
    if (dto.status && dto.status !== currentShipping.status) {
      this.validateStatusTransition(currentShipping.status, dto.status);
    }

    // Estado final (si no viene, se queda igual)
    const finalType = dto.type ?? currentShipping.type;

    // Dirección final (si no viene, se queda igual)
    const finalAddress =
      dto.address !== undefined ? dto.address?.trim() || null : currentShipping.address;

    // Regla ENVIO/RETIRO
    this.validateAddressRule(finalType, finalAddress);

    const updated = await this.prisma.shipping.update({
      where: { orderId }, // orderId es unique en schema
      data: {
        type: dto.type ?? undefined,
        status: dto.status ?? undefined,
        address: dto.address !== undefined ? dto.address?.trim() || null : undefined,
        reference:
          dto.reference !== undefined ? dto.reference?.trim() || null : undefined,
        contact: dto.contact !== undefined ? dto.contact?.trim() || null : undefined,
      },
      include: {
        order: {
          include: {
            customer: true,
            items: true,
          },
        },
      },
    });

    return updated;
  }
}
