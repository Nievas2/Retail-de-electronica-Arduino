import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'ID de la categoría' })
  @IsInt()
  categoryId: number;

  @ApiProperty({ example: 'Sensor ultrasónico HC-SR04' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Medición por ultrasonido 2cm-400cm' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
