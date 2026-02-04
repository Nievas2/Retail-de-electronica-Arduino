import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnCondition } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateReturnItemDto {
  @ApiProperty({ example: 1, description: 'ID del SKU' })
  @IsInt()
  skuId: number;

  @ApiProperty({ example: 1, description: 'Cantidad devuelta (>= 1)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    enum: ReturnCondition,
    example: ReturnCondition.NUEVO,
    description: 'Condición del producto devuelto',
  })
  @IsOptional()
  @IsEnum(ReturnCondition)
  condition?: ReturnCondition;
}

export class CreateReturnDto {
  @ApiProperty({
    example: 1,
    description:
      'ID del usuario que registra la devolución (temporal hasta tener JWT)',
  })
  @IsInt()
  createdById: number;

  @ApiPropertyOptional({
    example: 'Cliente se confundió de modelo / devolución por falla',
    description: 'Motivo general de la devolución',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    type: [CreateReturnItemDto],
    description: 'Items devueltos (mínimo 1)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];
}
