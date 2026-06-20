import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from '../dtos/create-variant.dto';
import { tenantContextStore } from '../../common/middleware/tenant.middleware';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  private getTenantId(): string {
    const tenantId = tenantContextStore.getStore();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not established.');
    }
    return tenantId;
  }

  async create(itemId: string, createVariantDto: CreateVariantDto) {
    const tenantId = this.getTenantId();
    
    // Verify menu item exists and belongs to this tenant
    const menuItem = await this.prisma.client.menuItem.findUnique({
      where: { id: itemId },
    });
    
    if (!menuItem || menuItem.restaurantId !== tenantId) {
      throw new NotFoundException(`Menu item with ID "${itemId}" not found.`);
    }

    return this.prisma.client.menuVariant.create({
      data: {
        ...createVariantDto,
        menuItemId: itemId,
      },
    });
  }

  async update(id: string, updateVariantDto: Partial<CreateVariantDto>) {
    const tenantId = this.getTenantId();
    
    const variant = await this.prisma.client.menuVariant.findUnique({
      where: { id },
      include: { menuItem: true },
    });

    if (!variant || variant.menuItem.restaurantId !== tenantId) {
      throw new NotFoundException(`Menu variant with ID "${id}" not found.`);
    }

    return this.prisma.client.menuVariant.update({
      where: { id },
      data: updateVariantDto,
    });
  }

  async remove(id: string) {
    const tenantId = this.getTenantId();

    const variant = await this.prisma.client.menuVariant.findUnique({
      where: { id },
      include: { menuItem: true },
    });

    if (!variant || variant.menuItem.restaurantId !== tenantId) {
      throw new NotFoundException(`Menu variant with ID "${id}" not found.`);
    }

    return this.prisma.client.menuVariant.delete({
      where: { id },
    });
  }
}
