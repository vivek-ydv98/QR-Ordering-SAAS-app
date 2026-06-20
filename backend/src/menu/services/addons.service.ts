import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddonDto } from '../dtos/create-addon.dto';
import { tenantContextStore } from '../../common/middleware/tenant.middleware';

@Injectable()
export class AddonsService {
  constructor(private readonly prisma: PrismaService) {}

  private getTenantId(): string {
    const tenantId = tenantContextStore.getStore();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not established.');
    }
    return tenantId;
  }

  async create(itemId: string, createAddonDto: CreateAddonDto) {
    const tenantId = this.getTenantId();
    
    // Verify menu item exists and belongs to this tenant
    const menuItem = await this.prisma.client.menuItem.findUnique({
      where: { id: itemId },
    });
    
    if (!menuItem || menuItem.restaurantId !== tenantId) {
      throw new NotFoundException(`Menu item with ID "${itemId}" not found.`);
    }

    return this.prisma.client.menuAddon.create({
      data: {
        ...createAddonDto,
        menuItemId: itemId,
      },
    });
  }

  async update(id: string, updateAddonDto: Partial<CreateAddonDto>) {
    const tenantId = this.getTenantId();
    
    const addon = await this.prisma.client.menuAddon.findUnique({
      where: { id },
      include: { menuItem: true },
    });

    if (!addon || addon.menuItem.restaurantId !== tenantId) {
      throw new NotFoundException(`Menu add-on with ID "${id}" not found.`);
    }

    return this.prisma.client.menuAddon.update({
      where: { id },
      data: updateAddonDto,
    });
  }

  async remove(id: string) {
    const tenantId = this.getTenantId();

    const addon = await this.prisma.client.menuAddon.findUnique({
      where: { id },
      include: { menuItem: true },
    });

    if (!addon || addon.menuItem.restaurantId !== tenantId) {
      throw new NotFoundException(`Menu add-on with ID "${id}" not found.`);
    }

    return this.prisma.client.menuAddon.delete({
      where: { id },
    });
  }
}
