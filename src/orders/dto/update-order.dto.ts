import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderChannel } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID del cliente (opcional). Se puede setear/null',
  })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({
    enum: OrderChannel,
    example: OrderChannel.MOSTRADOR,
    description: 'Canal del pedido',
  })
  @IsOptional()
  @IsEnum(OrderChannel)
  channel?: OrderChannel;

  @ApiPropertyOptional({
    example: 'Actualizar notas del pedido',
    description: 'Notas',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
