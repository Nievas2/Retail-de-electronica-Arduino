import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

@Injectable()
export class SuppliersService {
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

    const where: Prisma.SupplierWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const totalItems = await this.prisma.supplier.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const items = await this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, page, limit, totalItems, totalPages };
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier not found: ${id}`);
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const name = dto.name.trim();

    try {
      return await this.prisma.supplier.create({
        data: {
          name,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Supplier unique constraint violation');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Supplier not found: ${id}`);

    const nextName = dto.name?.trim();
    if (nextName !== undefined && nextName.length === 0) {
      throw new BadRequestException('name cannot be empty');
    }

    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: {
          name: nextName ?? undefined,
          phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
          email: dto.email !== undefined ? dto.email?.trim() || null : undefined,
          address:
            dto.address !== undefined ? dto.address?.trim() || null : undefined,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Supplier unique constraint violation');
      }
      throw e;
    }
  }

  async setActive(id: number, active: boolean) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Supplier not found: ${id}`);

    return this.prisma.supplier.update({
      where: { id },
      data: { active },
    });
  }
}
