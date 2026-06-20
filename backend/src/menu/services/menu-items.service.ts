import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuItemDto } from '../dtos/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dtos/update-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMenuItemDto: CreateMenuItemDto) {
    // Check if category exists
    const category = await this.prisma.client.menuCategory.findUnique({
      where: { id: createMenuItemDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${createMenuItemDto.categoryId}" not found.`);
    }

    return this.prisma.client.menuItem.create({
      data: createMenuItemDto,
      include: {
        variants: true,
        addons: true,
      },
    });
  }

  async findAll(categoryId?: string) {
    return this.prisma.client.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        variants: true,
        addons: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.client.menuItem.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
        },
        addons: true,
        category: true,
      },
    });
    if (!item) {
      throw new NotFoundException(`Menu item with ID "${id}" not found.`);
    }
    return item;
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto) {
    await this.findOne(id);
    return this.prisma.client.menuItem.update({
      where: { id },
      data: updateMenuItemDto,
      include: {
        variants: true,
        addons: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.client.menuItem.delete({
      where: { id },
    });
  }
}
