import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

@Injectable()
export class CategoriesService {
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
    const where: Prisma.CategoryWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const totalItems = await this.prisma.category.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const items = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, page, limit, totalItems, totalPages };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Category not found: ${id}`);
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();

    try {
      return await this.prisma.category.create({
        data: {
          name,
          description: dto.description?.trim() || null,
        },
      });
    } catch (e: any) {
      // Prisma unique violation: P2002
      if (e?.code === 'P2002') {
        throw new ConflictException(`Category name already exists: ${name}`);
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Category not found: ${id}`);

    const nextName = dto.name?.trim();
    if (nextName !== undefined && nextName.length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: nextName ?? undefined,
          description:
            dto.description !== undefined ? dto.description?.trim() || null : undefined,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002' && nextName) {
        throw new ConflictException(`Category name already exists: ${nextName}`);
      }
      throw e;
    }
  }

  async setActive(id: number, active: boolean) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Category not found: ${id}`);

    return this.prisma.category.update({
      where: { id },
      data: { active },
    });
  }
}
