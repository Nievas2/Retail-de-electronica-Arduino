import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseStatusDto {
  @ApiProperty({
    enum: PurchaseStatus,
    example: PurchaseStatus.RECIBIDA,
    description: 'Nuevo estado de la compra',
  })
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;

  @ApiPropertyOptional({
    example: 'Llegó todo completo',
    description: 'Nota/razón del cambio de estado',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
