import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSaleStatusDto {
  @ApiProperty({
    enum: SaleStatus,
    example: SaleStatus.CERRADA,
    description: 'Nuevo estado de la venta (ABIERTA → CERRADA)',
  })
  @IsEnum(SaleStatus)
  status: SaleStatus;

  @ApiPropertyOptional({
    example: 'Pago completado y entrega realizada',
    description: 'Nota/razón del cierre',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
