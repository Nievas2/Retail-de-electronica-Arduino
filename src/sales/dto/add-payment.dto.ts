import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddPaymentDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.EFECTIVO,
    description: 'Método de pago',
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    example: 10,
    description: 'Monto del pago (>= 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    example: 'TRX-123456',
    description: 'Referencia (transferencia/tarjeta)',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
