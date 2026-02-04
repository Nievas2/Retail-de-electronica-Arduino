import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingStatus, ShippingType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateShippingDto {
  @ApiPropertyOptional({
    enum: ShippingType,
    example: ShippingType.RETIRO,
    description: 'Cambiar tipo (ENVIO/RETIRO)',
  })
  @IsOptional()
  @IsEnum(ShippingType)
  type?: ShippingType;

  @ApiPropertyOptional({
    enum: ShippingStatus,
    example: ShippingStatus.EN_RUTA,
    description: 'Actualizar estado (PENDIENTE -> EN_RUTA -> ENTREGADO)',
  })
  @IsOptional()
  @IsEnum(ShippingStatus)
  status?: ShippingStatus;

  @ApiPropertyOptional({
    example: 'Av. Siempre Viva 123, Guayaquil',
    description:
      'Dirección (obligatoria si type final es ENVIO, no requerida si RETIRO)',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Departamento 2A, portón negro',
    description: 'Referencia adicional',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    example: '0988888888',
    description: 'Contacto/telefono',
  })
  @IsOptional()
  @IsString()
  contact?: string;
}
