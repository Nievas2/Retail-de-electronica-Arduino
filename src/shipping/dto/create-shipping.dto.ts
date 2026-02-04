import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateShippingDto {
  @ApiPropertyOptional({
    enum: ShippingType,
    example: ShippingType.ENVIO,
    description: 'Tipo de entrega: ENVIO o RETIRO (default ENVIO)',
  })
  @IsOptional()
  @IsEnum(ShippingType)
  type?: ShippingType;

  @ApiPropertyOptional({
    example: 'Av. Siempre Viva 123, Guayaquil',
    description:
      'Dirección (obligatoria si type=ENVIO, opcional si type=RETIRO)',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Casa color azul, tocar timbre',
    description: 'Referencia adicional del domicilio',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    example: '0999999999',
    description: 'Contacto/telefono del receptor',
  })
  @IsOptional()
  @IsString()
  contact?: string;
}
