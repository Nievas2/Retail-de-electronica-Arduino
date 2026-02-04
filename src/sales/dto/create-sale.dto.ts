import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateSaleItemDto {
  @ApiProperty({ example: 1, description: 'ID del SKU' })
  @IsInt()
  skuId: number;

  @ApiProperty({ example: 2, description: 'Cantidad (>= 1)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 5.5,
    description: 'Precio unitario aplicado (>= 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Descuento total de la línea (>= 0). Default 0',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID del cliente (opcional)',
  })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'ID del pedido origen (opcional)',
  })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiProperty({
    example: 1,
    description:
      'ID del usuario que crea la venta (temporal hasta tener JWT)',
  })
  @IsInt()
  createdById: number;

  @ApiPropertyOptional({
    example: 'Venta mostrador',
    description: 'Notas adicionales',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreateSaleItemDto],
    description: 'Items de venta (mínimo 1)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
