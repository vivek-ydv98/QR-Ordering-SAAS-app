import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { PrismaService } from '../../prisma/prisma.service';

// AsyncLocalStorage container instance to isolate tenant contexts
export const tenantContextStore = new AsyncLocalStorage<string>();

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let tenantId = req.headers['x-tenant-id'] as string;

    // Public and framework routes that do not require mandatory headers
    const isPublicAuthRoute = req.originalUrl.startsWith('/v1/auth');
    const isPublicRestaurantRoute = req.originalUrl.startsWith('/v1/restaurants');
    const isSocketIoRoute = req.originalUrl.startsWith('/socket.io');
    const isAuditLogsRoute = req.originalUrl.startsWith('/v1/audit-logs');
    const isUsersRoute = req.originalUrl.startsWith('/v1/users');
    const isHealthRoute = req.originalUrl.startsWith('/v1/health');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Helper function to resolve slug or uuid
    const resolveTenantId = async (id: string): Promise<string> => {
      if (!id) return id;
      if (uuidRegex.test(id)) {
        return id;
      }
      // If it's a slug, query DB to resolve to UUID
      const restaurant = await this.prisma.rawClient.restaurant.findUnique({
        where: { slug: id },
      });
      if (!restaurant) {
        throw new BadRequestException(`Invalid restaurant tenant slug: ${id}`);
      }
      return restaurant.id;
    };

    if (isPublicAuthRoute || isHealthRoute) {
      return next();
    }

    if (isPublicRestaurantRoute || isSocketIoRoute || isAuditLogsRoute || isUsersRoute) {
      if (tenantId) {
        try {
          const resolvedId = await resolveTenantId(tenantId);
          return tenantContextStore.run(resolvedId, () => {
            req['tenantId'] = resolvedId;
            next();
          });
        } catch (err) {
          return next(err);
        }
      }
      return next();
    }

    if (!tenantId) {
      throw new BadRequestException('Missing X-Tenant-ID header. Tenant isolation could not be established.');
    }

    try {
      const resolvedId = await resolveTenantId(tenantId);
      // Bind tenantId to current async thread execution context
      tenantContextStore.run(resolvedId, () => {
        // Attach to request object for downstream controllers and guards access
        req['tenantId'] = resolvedId;
        next();
      });
    } catch (err) {
      next(err);
    }
  }
}
