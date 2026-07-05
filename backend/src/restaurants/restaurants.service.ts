import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TableStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../common/errors/app-error';

@Injectable()
export class RestaurantsService {
  private activeWaiterCalls = new Map<string, any[]>();

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Fetch all onboarded restaurants for Super Admin
   */
  async getAllRestaurants() {
    return this.prisma.client.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        restaurantSettings: true,
        users: {
          where: { role: 'RESTAURANT_ADMIN' },
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
          },
        },
        _count: {
          select: { users: true, tables: true }
        }
      }
    });
  }

  /**
   * Fetch global statistics for Super Admin
   */
  async getSuperAdminStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const totalOrdersToday = await this.prisma.client.order.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const ordersByRestaurant = await this.prisma.client.order.groupBy({
      by: ['restaurantId'],
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _count: {
        id: true,
      },
    });

    return {
      totalOrdersToday,
      ordersByRestaurant: ordersByRestaurant.map(item => ({
        restaurantId: item.restaurantId,
        count: item._count.id
      }))
    };
  }


  /**
   * Create a new restaurant and initialize its settings
   */
  async createRestaurant(data: {
    name: string;
    slug: string;
    logoUrl?: string;
    ownerName?: string;
    ownerEmail?: string;
    phone?: string;
    address?: string;
    maxTables?: number;
  }) {
    const existing = await this.prisma.client.restaurant.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new ConflictError(`Restaurant with slug "${data.slug}" already exists.`);
    }

    const restaurant = await this.prisma.client.restaurant.create({
      data: {
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        phone: data.phone,
        address: data.address,
        maxTables: data.maxTables ?? 10,
        isActive: true,
        subscriptionStatus: 'active',
      },
    });

    // Create default settings
    await this.prisma.client.restaurantSetting.create({
      data: {
        restaurantId: restaurant.id,
        isVegOnly: false,
        allowUpiPayments: true,
        allowWaiterCall: true,
        cgstRate: 2.5,
        sgstRate: 2.5,
        serviceChargeRate: 5.0,
      },
    });

    // Log audit
    await this.prisma.client.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        action: 'CREATE_RESTAURANT',
        details: `Restaurant "${restaurant.name}" created and initialized by admin.`,
      },
    });

    return restaurant;
  }

  /**
   * Update restaurant settings or status
   */
  async updateRestaurant(id: string, data: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    ownerName?: string;
    ownerEmail?: string;
    phone?: string;
    address?: string;
    subscriptionStatus?: string;
    isActive?: boolean;
    maxTables?: number;
    qrFgColor?: string;
    qrBgColor?: string;
    qrLogoUrl?: string;
  }) {
    const restaurant = await this.prisma.client.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundError(`Restaurant with ID "${id}" not found`);
    }

    const { qrFgColor, qrBgColor, qrLogoUrl, ...rest } = data;

    const updated = await this.prisma.client.restaurant.update({
      where: { id },
      data: rest,
    });

    if (qrFgColor !== undefined || qrBgColor !== undefined || qrLogoUrl !== undefined) {
      await this.prisma.client.restaurantSetting.update({
        where: { restaurantId: id },
        data: {
          ...(qrFgColor !== undefined && { qrFgColor }),
          ...(qrBgColor !== undefined && { qrBgColor }),
          ...(qrLogoUrl !== undefined && { qrLogoUrl }),
        },
      });
    }

    // Log audit
    await this.prisma.client.auditLog.create({
      data: {
        restaurantId: updated.id,
        action: 'UPDATE_RESTAURANT',
        details: `Updated restaurant properties/status for "${updated.name}".`,
      },
    });

    return updated;
  }

  /**
   * Fetch restaurant details along with settings by its slug identifier
   */
  async getRestaurantBySlug(slug: string) {
    const restaurant = await this.prisma.client.restaurant.findUnique({
      where: { slug },
      include: {
        restaurantSettings: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundError(`Restaurant with slug "${slug}" not found.`);
    }

    return restaurant;
  }

  async getRestaurantById(id: string) {
    const restaurant = await this.prisma.client.restaurant.findUnique({
      where: { id },
      include: {
        restaurantSettings: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundError(`Restaurant with ID "${id}" not found.`);
    }

    return restaurant;
  }

  /**
   * Resolve a slug-or-UUID to a definitive UUID.
   * Public endpoints receive a slug string; admin endpoints may use the UUID directly.
   */
  private async resolveRestaurantId(slugOrId: string): Promise<string> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(slugOrId)) {
      return slugOrId;
    }
    const restaurant = await this.prisma.rawClient.restaurant.findUnique({
      where: { slug: slugOrId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundError(`Restaurant with slug "${slugOrId}" not found.`);
    }
    return restaurant.id;
  }

  async getMenu(slugOrId: string, includeUnavailable = false) {
    const restaurantId = await this.resolveRestaurantId(slugOrId);
    return this.prisma.rawClient.menuCategory.findMany({
      where: { restaurantId, ...(includeUnavailable ? {} : { isAvailable: true }) },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: {
          where: includeUnavailable ? {} : { isAvailable: true },
          orderBy: { name: 'asc' },
          include: {
            variants: true,
            addons: true,
          },
        },
      },
    });
  }

  async getTables(slugOrId: string) {
    const restaurantId = await this.resolveRestaurantId(slugOrId);
    return this.prisma.rawClient.table.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  // ─── CATEGORY MANAGEMENT ─────────────────────────────────────────────────────

  async createCategory(restaurantId: string, name: string, sortOrder = 0) {
    return this.prisma.client.menuCategory.create({
      data: { restaurantId, name, sortOrder, isAvailable: true },
    });
  }

  async updateCategory(
    categoryId: string,
    data: { name?: string; sortOrder?: number; isAvailable?: boolean },
  ) {
    return this.prisma.client.menuCategory.update({
      where: { id: categoryId },
      data,
    });
  }

  async deleteCategory(categoryId: string) {
    // Cascade to menu items first (in case DB doesn't cascade)
    await this.prisma.client.menuItem.deleteMany({ where: { categoryId } });
    return this.prisma.client.menuCategory.delete({ where: { id: categoryId } });
  }

  // ─── MENU ITEM MANAGEMENT ─────────────────────────────────────────────────────

  async createMenuItem(
    restaurantId: string,
    data: {
      categoryId: string;
      name: string;
      description: string;
      price: number;
      isVeg?: boolean;
      imageUrl?: string;
    },
  ) {
    return this.prisma.client.menuItem.create({
      data: {
        restaurantId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        isVeg: data.isVeg ?? true,
        isAvailable: true,
        imageUrl: data.imageUrl ?? null,
      },
    });
  }

  async updateMenuItem(
    itemId: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      isVeg?: boolean;
      isAvailable?: boolean;
      imageUrl?: string;
    },
  ) {
    return this.prisma.client.menuItem.update({
      where: { id: itemId },
      data,
    });
  }

  async deleteMenuItem(itemId: string) {
    return this.prisma.client.menuItem.delete({ where: { id: itemId } });
  }

  // ─── TABLE MANAGEMENT ────────────────────────────────────────────────────────

  async createTable(restaurantId: string, name: string) {
    const restaurant = await this.prisma.client.restaurant.findUnique({
      where: { id: restaurantId },
      include: { _count: { select: { tables: true } } },
    });
    if (!restaurant) {
      throw new NotFoundError(`Restaurant with ID "${restaurantId}" not found.`);
    }
    if (restaurant._count.tables >= restaurant.maxTables) {
      throw new ValidationError(
        `Table limit of ${restaurant.maxTables} exceeded for this restaurant.`,
        'maxTables'
      );
    }

    const existingTable = await this.prisma.client.table.findUnique({
      where: {
        restaurantId_name: {
          restaurantId,
          name,
        },
      },
    });
    if (existingTable) {
      throw new ValidationError(`Table with name "${name}" already exists in this restaurant.`, 'name');
    }

    return this.prisma.client.table.create({
      data: {
        restaurantId,
        name,
        isActive: true,
        status: 'VACANT',
      },
    });
  }

  async getTableById(tableId: string, restaurantIdOrSlug?: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(tableId)) {
      const table = await this.prisma.client.table.findUnique({
        where: { id: tableId },
      });
      if (!table) {
        throw new NotFoundError(`Table with ID "${tableId}" not found.`);
      }
      return table;
    }

    if (!restaurantIdOrSlug) {
      throw new ValidationError('Restaurant identifier required to look up table by name.', 'restaurantId');
    }

    let rId: string;
    try {
      rId = await this.resolveRestaurantId(restaurantIdOrSlug);
    } catch {
      throw new NotFoundError(`Restaurant "${restaurantIdOrSlug}" not found.`);
    }

    const table = await this.prisma.client.table.findFirst({
      where: {
        restaurantId: rId,
        name: {
          equals: tableId,
          mode: 'insensitive',
        },
      },
    });

    if (!table) {
      throw new NotFoundError(`Table "${tableId}" not found for restaurant.`);
    }
    return table;
  }

  addWaiterCall(tenantId: string, callPayload: any) {
    const calls = this.activeWaiterCalls.get(tenantId) || [];
    calls.push(callPayload);
    this.activeWaiterCalls.set(tenantId, calls);
  }

  resolveWaiterCall(tenantId: string, callId: string) {
    const calls = this.activeWaiterCalls.get(tenantId) || [];
    this.activeWaiterCalls.set(tenantId, calls.filter(c => c.id !== callId));
  }

  getWaiterCalls(tenantId: string) {
    return this.activeWaiterCalls.get(tenantId) || [];
  }

  async deleteTable(tableId: string) {
    const table = await this.prisma.client.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new NotFoundError(`Table with ID "${tableId}" not found.`);
    }
    return this.prisma.client.table.delete({
      where: { id: tableId },
    });
  }

  async updateTable(
    tableId: string,
    data: { isActive?: boolean; name?: string; status?: TableStatus; qrCodeUrl?: string | null },
    user?: any,
  ) {
    const table = await this.prisma.client.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new NotFoundError(`Table with ID "${tableId}" not found.`);
    }

    if (user && user.role !== 'SUPER_ADMIN') {
      if (table.restaurantId !== user.restaurantId) {
        throw new ForbiddenError('You do not have permission to manage this table.');
      }
      if (data.name !== undefined && data.name !== table.name) {
        throw new ForbiddenError('Only the Super Admin can rename or create tables.');
      }
      if (data.qrCodeUrl !== undefined) {
        throw new ForbiddenError('Only the Super Admin can modify QR code configurations.');
      }
    }

    return this.prisma.client.table.update({
      where: { id: tableId },
      data,
    });
  }

  async bulkRegenerateQrCodes(restaurantId: string) {
    const restaurant = await this.prisma.client.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundError(`Restaurant with ID "${restaurantId}" not found.`);
    }
    return this.prisma.client.table.updateMany({
      where: { restaurantId },
      data: { qrCodeUrl: null },
    });
  }

  async getRestaurantSettings(restaurantId: string) {
    const settings = await this.prisma.client.restaurantSetting.findUnique({
      where: { restaurantId },
    });
    if (!settings) {
      throw new NotFoundError(`Settings for restaurant ID "${restaurantId}" not found.`);
    }
    return settings;
  }

  async updateRestaurantSettings(
    restaurantId: string,
    data: { cgstRate?: number | null; sgstRate?: number | null; serviceChargeRate?: number | null }
  ) {
    const settings = await this.prisma.client.restaurantSetting.findUnique({
      where: { restaurantId },
    });
    if (!settings) {
      throw new NotFoundError(`Settings for restaurant ID "${restaurantId}" not found.`);
    }

    return this.prisma.client.restaurantSetting.update({
      where: { restaurantId },
      data: {
        cgstRate: data.cgstRate === null || data.cgstRate === undefined ? null : data.cgstRate,
        sgstRate: data.sgstRate === null || data.sgstRate === undefined ? null : data.sgstRate,
        serviceChargeRate: data.serviceChargeRate === null || data.serviceChargeRate === undefined ? null : data.serviceChargeRate,
      },
    });
  }
}

