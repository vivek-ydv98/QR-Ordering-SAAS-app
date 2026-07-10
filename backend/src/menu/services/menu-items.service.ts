import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateMenuItemDto } from '../dtos/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dtos/update-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(createMenuItemDto: CreateMenuItemDto) {
    // Check if category exists
    const category = await this.prisma.client.menuCategory.findUnique({
      where: { id: createMenuItemDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${createMenuItemDto.categoryId}" not found.`);
    }

    const foodTypeToCheck = createMenuItemDto.foodType || 'VEG';
    const settings = await this.prisma.client.restaurantSetting.findFirst();
    const allowedFoodTypes = settings?.allowedFoodTypes ?? ['VEG', 'NON_VEG', 'EGG', 'VEGAN', 'JAIN'];
    if (!allowedFoodTypes.includes(foodTypeToCheck)) {
      throw new ConflictException(`Food type "${foodTypeToCheck}" is currently disabled in restaurant settings.`);
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
    const settings = await this.prisma.client.restaurantSetting.findFirst();
    const allowedFoodTypes = settings?.allowedFoodTypes ?? ['VEG', 'NON_VEG', 'EGG', 'VEGAN', 'JAIN'];

    return this.prisma.client.menuItem.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        foodType: { in: allowedFoodTypes },
      },
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

    const settings = await this.prisma.client.restaurantSetting.findFirst();
    const allowedFoodTypes = settings?.allowedFoodTypes ?? ['VEG', 'NON_VEG', 'EGG', 'VEGAN', 'JAIN'];
    if (!allowedFoodTypes.includes(item.foodType)) {
      throw new NotFoundException(`Menu item with ID "${id}" not found.`);
    }

    return item;
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto & { imagePublicId?: string }) {
    const existing = await this.findOne(id);

    // If externalImageUrl is explicitly set to null, clear it
    if ('externalImageUrl' in updateMenuItemDto && updateMenuItemDto.externalImageUrl === null) {
      (updateMenuItemDto as any).externalImageUrl = null;
    }

    if (updateMenuItemDto.foodType) {
      const settings = await this.prisma.client.restaurantSetting.findFirst();
      const allowedFoodTypes = settings?.allowedFoodTypes ?? ['VEG', 'NON_VEG', 'EGG', 'VEGAN', 'JAIN'];
      if (!allowedFoodTypes.includes(updateMenuItemDto.foodType)) {
        throw new ConflictException(`Food type "${updateMenuItemDto.foodType}" is currently disabled in restaurant settings.`);
      }
    }

    // Delete old Cloudinary image if being replaced
    if (updateMenuItemDto.imagePublicId && existing.imagePublicId && updateMenuItemDto.imagePublicId !== existing.imagePublicId) {
      await this.cloudinaryService.deleteImage(existing.imagePublicId);
    }

    return this.prisma.client.menuItem.update({
      where: { id },
      data: updateMenuItemDto as any,
      include: {
        variants: true,
        addons: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    try {
      const deleted = await this.prisma.client.menuItem.delete({
        where: { id },
      });
      // Delete Cloudinary image if it exists
      if (existing.imagePublicId) {
        await this.cloudinaryService.deleteImage(existing.imagePublicId);
      }
      return deleted;
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete menu item because it is referenced by existing orders. You can make it unavailable instead.'
        );
      }
      throw error;
    }
  }

  async removeImage(id: string) {
    const existing = await this.prisma.client.menuItem.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Menu item with ID "${id}" not found.`);
    }
    if (existing.imagePublicId) {
      try {
        await this.cloudinaryService.deleteImage(existing.imagePublicId);
      } catch (error) {
        console.error(`[MenuItemsService] Failed to delete Cloudinary image ${existing.imagePublicId}:`, error);
      }
    }
    return this.prisma.client.menuItem.update({
      where: { id },
      data: {
        imageUrl: null,
        imagePublicId: null,
      },
      include: { variants: true, addons: true },
    });
  }
}
