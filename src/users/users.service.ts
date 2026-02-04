import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

@Injectable()
export class UsersService {
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

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { role: { name: { equals: search as any } } },
          ],
        }
      : {};

    const totalItems = await this.prisma.user.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const items = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        roleId: true,
        role: true,
        name: true,
        username: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, page, limit, totalItems, totalPages };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        roleId: true,
        role: true,
        name: true,
        username: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException(`User not found: ${id}`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException(`Role not found: ${dto.roleId}`);

    const username = dto.username.trim().toLowerCase();
    const name = dto.name.trim();

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    try {
      const created = await this.prisma.user.create({
        data: {
          roleId: dto.roleId,
          name,
          username,
          passwordHash,
          active: dto.active ?? true,
        },
        select: {
          id: true,
          roleId: true,
          role: true,
          name: true,
          username: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return created;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Username already exists');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`User not found: ${id}`);

    if (dto.roleId !== undefined) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException(`Role not found: ${dto.roleId}`);
    }

    const nextUsername =
      dto.username !== undefined ? dto.username.trim().toLowerCase() : undefined;
    if (nextUsername !== undefined && nextUsername.length === 0) {
      throw new BadRequestException('username cannot be empty');
    }

    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    if (nextName !== undefined && nextName.length === 0) {
      throw new BadRequestException('name cannot be empty');
    }

    const updateData: Prisma.UserUpdateInput = {
      roleId: dto.roleId ?? undefined,
      username: nextUsername ?? undefined,
      name: nextName ?? undefined,
      active: dto.active ?? undefined,
    };

    if (dto.password !== undefined) {
      const saltRounds = 10;
      updateData.passwordHash = await bcrypt.hash(dto.password, saltRounds);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          roleId: true,
          role: true,
          name: true,
          username: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Username already exists');
      }
      throw e;
    }
  }

  async setActive(id: number, active: boolean) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`User not found: ${id}`);

    return this.prisma.user.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        roleId: true,
        role: true,
        name: true,
        username: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
