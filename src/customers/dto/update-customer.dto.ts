import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Juan Pérez (actualizado)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: '0988888888' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'juan@nuevo.com' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ example: '0922222222' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cedulaRuc?: string;

  @ApiPropertyOptional({ example: 'Nueva dirección' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
