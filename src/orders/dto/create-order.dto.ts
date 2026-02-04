import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderChannel } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID del cliente (opcional)',
  })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({
    enum: OrderChannel,
    example: OrderChannel.WHATSAPP,
    description: 'Canal del pedido (WHATSAPP / MOSTRADOR)',
  })
  @IsOptional()
  @IsEnum(OrderChannel)
  channel?: OrderChannel;

  @ApiPropertyOptional({
    example: 'Pedido por WhatsApp, enviar cotización',
    description: 'Notas del pedido',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
