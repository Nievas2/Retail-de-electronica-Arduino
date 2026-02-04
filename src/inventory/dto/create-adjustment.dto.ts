import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

export class CreateAdjustmentDto {
  @ApiProperty({
    description: 'ID del SKU a ajustar',
    example: 1,
  })
  @IsInt()
  skuId: number;

  @ApiProperty({
    description:
      'Cantidad del ajuste. Puede ser positiva o negativa. No puede ser 0.',
    example: -2,
  })
  @IsInt()
  @NotEquals(0)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Motivo del ajuste (conteo físico, pérdida, corrección, etc.)',
    example: 'Conteo físico: faltaban 2 unidades',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
