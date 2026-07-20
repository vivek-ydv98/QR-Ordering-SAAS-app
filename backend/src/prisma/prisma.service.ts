import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantContextStore } from '../common/middleware/tenant.middleware';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prismaInstance: PrismaClient;
  
  // Expose extended (tenant-scoped) client to services for query execution
  public readonly client: any;

  // Expose the raw unscoped client for public endpoints that don't have tenant context
  public get rawClient(): PrismaClient {
    return this.prismaInstance;
  }

  constructor() {
    this.prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['query', 'info', 'warn', 'error'],
    });

    this.client = this.prismaInstance.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = tenantContextStore.getStore();

            // List of tables that are scoped under restaurant tenants
            const tenantScopedModels = [
              'Staff',
              'Table',
              'MenuCategory',
              'MenuItem',
              'Order',
              'KitchenTicket',
              'RestaurantSetting',
              'AuditLog'
            ];

            if (tenantId && tenantScopedModels.includes(model)) {
              const queryArgs = args as any;

              // 1. Enforce query filters for reads, updates, and deletes
              if (operation !== 'create') {
                queryArgs.where = queryArgs.where || {};
                queryArgs.where.restaurantId = tenantId;
              }

              // 2. Enforce insertion properties on creates
              if (operation === 'create') {
                if (queryArgs.data) {
                  queryArgs.data.restaurantId = tenantId;
                }
              }

              // 3. Handle upsert operations
              if (operation === 'upsert') {
                if (queryArgs.create) queryArgs.create.restaurantId = tenantId;
                if (queryArgs.update) queryArgs.update.restaurantId = tenantId;
              }
            }

            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.prismaInstance.$connect();
  }

  async onModuleDestroy() {
    await this.prismaInstance.$disconnect();
  }
}
