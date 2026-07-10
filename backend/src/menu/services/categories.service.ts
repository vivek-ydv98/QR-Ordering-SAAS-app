import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.client.menuCategory.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.client.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.client.menuCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Menu category with ID "${id}" not found.`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto & { imagePublicId?: string }) {
    const existing = await this.findOne(id);

    // Delete old Cloudinary image if being replaced
    if (updateCategoryDto.imagePublicId && existing.imagePublicId && updateCategoryDto.imagePublicId !== existing.imagePublicId) {
      await this.cloudinaryService.deleteImage(existing.imagePublicId);
    }

    return this.prisma.client.menuCategory.update({
      where: { id },
      data: updateCategoryDto as any,
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    try {
      const deleted = await this.prisma.client.menuCategory.delete({
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
          'Cannot delete category because it contains items that are referenced by existing orders. You can make it unavailable instead.'
        );
      }
      throw error;
    }
  }

  async sort(ids: string[]) {
    // Perform bulk updates inside a transaction
    return this.prisma.client.$transaction(
      ids.map((id, index) =>
        this.prisma.client.menuCategory.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
