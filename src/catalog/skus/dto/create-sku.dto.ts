import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

export class CreateSkuDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 'HC-SR04-ORIG', description: 'Código SKU único' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  skuCode: string;

  @ApiPropertyOptional({ example: 'Generic', description: 'Marca' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @ApiPropertyOptional({ example: 'v2', description: 'Versión o revisión' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  version?: string;

  @ApiPropertyOptional({ example: true, description: 'Original vs compatible' })
  @IsOptional()
  @IsBoolean()
  isOriginal?: boolean;

  @ApiPropertyOptional({ example: '5V', description: 'Voltaje o especificación' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  voltage?: string;

  @ApiPropertyOptional({
    example: 3.5,
    description: 'Precio referencia (>=0)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  referencePrice?: number;
}
