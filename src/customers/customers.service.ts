import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePageLimit(page?: number, limit?: number) {
    const safePage = Number.isFinite(page as number) ? Number(page) : 1;
    const safeLimit = Number.isFinite(limit as number) ? Number(limit) : 20;

    return {
      page: Math.max(1, safePage),
      limit: Math.min(100, Math.max(1, safeLimit)),
    };
  }

  async findAll(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<any>> {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);
    const search = params.search?.trim();

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { cedulaRuc: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const totalItems = await this.prisma.customer.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const items = await this.prisma.customer.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, page, limit, totalItems, totalPages };
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer not found: ${id}`);
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const fullName = dto.fullName.trim();

    try {
      return await this.prisma.customer.create({
        data: {
          fullName,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          cedulaRuc: dto.cedulaRuc?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Customer unique constraint violation');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Customer not found: ${id}`);

    const nextName = dto.fullName?.trim();
    if (nextName !== undefined && nextName.length === 0) {
      throw new BadRequestException('fullName cannot be empty');
    }

    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          fullName: nextName ?? undefined,
          phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
          email: dto.email !== undefined ? dto.email?.trim() || null : undefined,
          cedulaRuc:
            dto.cedulaRuc !== undefined ? dto.cedulaRuc?.trim() || null : undefined,
          address:
            dto.address !== undefined ? dto.address?.trim() || null : undefined,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Customer unique constraint violation');
      }
      throw e;
    }
  }

  async setActive(id: number, active: boolean) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Customer not found: ${id}`);

    return this.prisma.customer.update({
      where: { id },
      data: { active },
    });
  }
}
