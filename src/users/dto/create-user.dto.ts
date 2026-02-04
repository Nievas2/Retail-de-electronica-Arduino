import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 1, description: 'ID del rol' })
  @IsInt()
  roleId: number;

  @ApiProperty({ example: 'Marcos Moreira' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'marcos', description: 'Username único' })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  username: string;

  @ApiProperty({ example: '123456', description: 'Password en texto plano (se hashea)' })
  @IsString()
  @MinLength(4)
  @MaxLength(120)
  password: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
