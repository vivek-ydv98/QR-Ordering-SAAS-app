import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Bypass for public auth endpoints
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublicRoute) {
      return true;
    }

    const tenantHeader = request.headers['x-tenant-id'];
    const user = request.user; // Set downstream by JWT Strategy AuthGuard

    if (!user) {
      // If customer session (anonymous orders), we rely on validation of table tokens
      // If staff session, we must enforce strict cross-tenant verification
      return true;
    }

    // Super Admin role overrides tenant boundaries to manage pricing or suspensions
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (user.restaurantId !== tenantHeader) {
      throw new ForbiddenException(
        `Access denied. JWT scope (${user.restaurantId}) does not match the active tenant header (${tenantHeader}).`
      );
    }

    return true;
  }
}
