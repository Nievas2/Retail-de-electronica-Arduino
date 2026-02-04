import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateSkuDto {
  @ApiPropertyOptional({ example: 2, description: 'Nuevo productId' })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ example: 'HC-SR04-COMP', description: 'Nuevo skuCode' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  skuCode?: string;

  @ApiPropertyOptional({ example: 'OEM', description: 'Marca' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @ApiPropertyOptional({ example: 'v3', description: 'Versión' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  version?: string;

  @ApiPropertyOptional({ example: false, description: 'Original' })
  @IsOptional()
  @IsBoolean()
  isOriginal?: boolean;

  @ApiPropertyOptional({ example: '3.3V', description: 'Voltaje' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  voltage?: string;

  @ApiPropertyOptional({ example: 4.25, description: 'Precio referencia' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  referencePrice?: number;
}
