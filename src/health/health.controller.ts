import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Ping simple a la DB (PostgreSQL)
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSec: Math.floor(process.uptime()),
        db: { ok: true },
      };
    } catch {
      throw new ServiceUnavailableException('Database connection failed');
    }
  }
}
