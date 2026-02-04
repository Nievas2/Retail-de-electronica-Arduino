import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreatePurchaseItemDto {
  @ApiProperty({ example: 1, description: 'ID del SKU' })
  @IsInt()
  skuId: number;

  @ApiProperty({ example: 10, description: 'Cantidad comprada (>= 1)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 2.5,
    description: 'Costo unitario (>= 0)',
  })
  @Min(0)
  unitCost: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 1, description: 'ID del proveedor' })
  @IsInt()
  supplierId: number;

  @ApiProperty({
    example: 1,
    description:
      'ID del usuario que registra la compra (temporal hasta tener JWT)',
  })
  @IsInt()
  createdById: number;

  @ApiPropertyOptional({
    example: 'Compra de reabastecimiento semanal',
    description: 'Notas adicionales',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreatePurchaseItemDto],
    description: 'Items de la compra (mínimo 1)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];
}
