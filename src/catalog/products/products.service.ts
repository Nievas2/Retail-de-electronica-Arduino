import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

@Injectable()
export class ProductsService {
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
    categoryId?: number;
    page?: number;
    limit?: number;
  }): Promise<Paginated<any>> {
    const { page, limit } = this.normalizePageLimit(params.page, params.limit);
    const search = params.search?.trim();

    const where: Prisma.ProductWhereInput = {
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const totalItems = await this.prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const items = await this.prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, page, limit, totalItems, totalPages };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, skus: true },
    });
    if (!product) throw new NotFoundException(`Product not found: ${id}`);
    return product;
  }

  async create(dto: CreateProductDto) {
    const name = dto.name.trim();

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.active) {
      throw new NotFoundException(`Category not found: ${dto.categoryId}`);
    }

    try {
      return await this.prisma.product.create({
        data: {
          categoryId: dto.categoryId,
          name,
          description: dto.description?.trim() || null,
        },
        include: { category: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Product unique constraint violation');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Product not found: ${id}`);

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || !category.active) {
        throw new NotFoundException(`Category not found: ${dto.categoryId}`);
      }
    }

    const nextName = dto.name?.trim();
    if (nextName !== undefined && nextName.length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId ?? undefined,
        name: nextName ?? undefined,
        description:
          dto.description !== undefined ? dto.description?.trim() || null : undefined,
      },
      include: { category: true },
    });
  }

  async setActive(id: number, active: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product not found: ${id}`);

    return this.prisma.product.update({
      where: { id },
      data: { active },
      include: { category: true },
    });
  }
}
