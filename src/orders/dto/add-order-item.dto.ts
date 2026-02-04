import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class AddOrderItemDto {
  @ApiProperty({ example: 1, description: 'ID del SKU' })
  @IsInt()
  skuId: number;

  @ApiProperty({ example: 2, description: 'Cantidad (>= 1)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 5.5,
    description: 'Precio estimado unitario (opcional)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedPrice?: number;
}
