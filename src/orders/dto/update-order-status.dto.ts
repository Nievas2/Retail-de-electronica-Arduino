import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.CONFIRMADO,
    description: 'Nuevo estado del pedido',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    example: 'Cliente confirmó, se reserva stock',
    description: 'Razón / nota del cambio de estado',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
