import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  getAdminDefaultRoute,
  extractTenantSlug,
  isCustomerRoute,
} from '../../../../frontend/src/lib/routes';

describe('ROUTES', () => {
  it('has HOME route', () => {
    expect(ROUTES.HOME).toBe('/');
  });

  it('has auth routes', () => {
    expect(ROUTES.AUTH.LOGIN).toBe('/login');
    expect(ROUTES.AUTH.LOGOUT).toBe('/logout');
  });

  it('generates customer table route', () => {
    expect(ROUTES.CUSTOMER.TABLE('my-restaurant', 'table-123')).toBe(
      '/my-restaurant/table/table-123'
    );
  });

  it('generates customer menu route', () => {
    expect(ROUTES.CUSTOMER.MENU('my-restaurant')).toBe('/my-restaurant/menu');
  });

  it('generates all admin routes with tenant slug', () => {
    expect(ROUTES.ADMIN.LIVE_ORDERS('my-place')).toBe('/my-place/app-live-orders');
    expect(ROUTES.ADMIN.KDS('my-place')).toBe('/my-place/app-kds');
    expect(ROUTES.ADMIN.WAITER_HUB('my-place')).toBe('/my-place/app-waiter-hub');
    expect(ROUTES.ADMIN.BILLING('my-place')).toBe('/my-place/app-billing');
    expect(ROUTES.ADMIN.MENU('my-place')).toBe('/my-place/app-menu');
    expect(ROUTES.ADMIN.CATEGORIES('my-place')).toBe('/my-place/app-categories');
    expect(ROUTES.ADMIN.TABLES('my-place')).toBe('/my-place/app-tables');
    expect(ROUTES.ADMIN.STAFF('my-place')).toBe('/my-place/app-staff');
    expect(ROUTES.ADMIN.SETTINGS('my-place')).toBe('/my-place/app-settings');
    expect(ROUTES.ADMIN.PROFILE('my-place')).toBe('/my-place/app-profile');
  });

  it('generates admin param routes with tenant slug', () => {
    expect(ROUTES.ADMIN.MENU_ITEM('my-place', 'item-1')).toBe('/my-place/app-menu/item-1');
    expect(ROUTES.ADMIN.TABLE('my-place', 't-1')).toBe('/my-place/app-tables/t-1');
    expect(ROUTES.ADMIN.STAFF_MEMBER('my-place', 's-1')).toBe('/my-place/app-staff/s-1');
  });

  it('has super admin routes', () => {
    expect(ROUTES.SUPER_ADMIN.ROOT).toBe('/super-admin');
    expect(ROUTES.SUPER_ADMIN.RESTAURANT('r-1')).toBe('/super-admin/restaurants/r-1');
  });

  it('has legacy routes for 301 redirects', () => {
    expect(ROUTES.LEGACY.KITCHEN).toBe('/kitchen');
    expect(ROUTES.LEGACY.WAITER).toBe('/waiter');
    expect(ROUTES.LEGACY.LOGIN).toBe('/login');
    expect(ROUTES.LEGACY.CUSTOMER_V1('r', 't-1')).toBe('/r/r/table/t-1');
    expect(ROUTES.LEGACY.ADMIN_DASHBOARD).toBe('/admin/dashboard');
  });
});

describe('getAdminDefaultRoute', () => {
  const tenant = 'my-place';

  it('returns KDS for KITCHEN_STAFF', () => {
    expect(getAdminDefaultRoute('KITCHEN_STAFF', tenant)).toBe(ROUTES.ADMIN.KDS(tenant));
  });

  it('returns WaiterHub for WAITER', () => {
    expect(getAdminDefaultRoute('WAITER', tenant)).toBe(ROUTES.ADMIN.WAITER_HUB(tenant));
  });

  it('returns Billing for CASHIER', () => {
    expect(getAdminDefaultRoute('CASHIER', tenant)).toBe(ROUTES.ADMIN.BILLING(tenant));
  });

  it('returns LiveOrders for admin role', () => {
    expect(getAdminDefaultRoute('ADMIN', tenant)).toBe(ROUTES.ADMIN.LIVE_ORDERS(tenant));
  });

  it('returns LiveOrders for MANAGER', () => {
    expect(getAdminDefaultRoute('MANAGER', tenant)).toBe(ROUTES.ADMIN.LIVE_ORDERS(tenant));
  });

  it('returns LiveOrders for unknown roles', () => {
    expect(getAdminDefaultRoute('UNKNOWN', tenant)).toBe(ROUTES.ADMIN.LIVE_ORDERS(tenant));
  });
});

describe('extractTenantSlug', () => {
  it('extracts slug from customer table route', () => {
    expect(extractTenantSlug('/my-place/table/t-1')).toBe('my-place');
  });

  it('extracts slug from menu route', () => {
    expect(extractTenantSlug('/my-place/menu')).toBe('my-place');
  });

  it('extracts slug from admin route', () => {
    expect(extractTenantSlug('/my-place/admin/live-orders')).toBe('my-place');
    expect(extractTenantSlug('/my-place/app-live-orders')).toBe('my-place');
  });

  it('extracts slug from admin route with deeper path', () => {
    expect(extractTenantSlug('/my-place/admin/menu/item-1')).toBe('my-place');
    expect(extractTenantSlug('/my-place/app-menu/item-1')).toBe('my-place');
  });

  it('returns null for bare admin routes (no slug)', () => {
    expect(extractTenantSlug('/admin/live-orders')).toBeNull();
    expect(extractTenantSlug('/app-live-orders')).toBeNull();
  });

  it('returns null for auth routes', () => {
    expect(extractTenantSlug('/login')).toBeNull();
  });

  it('returns null for super-admin routes', () => {
    expect(extractTenantSlug('/super-admin')).toBeNull();
  });

  it('returns null for root path', () => {
    expect(extractTenantSlug('/')).toBeNull();
  });

  it('returns null for _next routes', () => {
    expect(extractTenantSlug('/_next/static/chunk.js')).toBeNull();
  });

  it('returns null for api routes', () => {
    expect(extractTenantSlug('/api/auth')).toBeNull();
  });
});

describe('isCustomerRoute', () => {
  it('returns true for customer table route', () => {
    expect(isCustomerRoute('/my-place/table/t-1')).toBe(true);
  });

  it('returns true for customer menu route', () => {
    expect(isCustomerRoute('/my-place/menu')).toBe(true);
  });

  it('returns true for admin route with slug', () => {
    expect(isCustomerRoute('/my-place/admin/live-orders')).toBe(true);
    expect(isCustomerRoute('/my-place/app-live-orders')).toBe(true);
  });

  it('returns false for bare admin routes (no slug)', () => {
    expect(isCustomerRoute('/admin/billing')).toBe(false);
    expect(isCustomerRoute('/app-billing')).toBe(false);
  });

  it('returns false for root', () => {
    expect(isCustomerRoute('/')).toBe(false);
  });
});
