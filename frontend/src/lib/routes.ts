export const ROUTES = {
  HOME: '/',

  AUTH: {
    LOGIN: '/login',
    LOGOUT: '/logout',
  },

  CUSTOMER: {
    MENU: (tenant: string) => `/${tenant}/menu`,
    TABLE: (tenant: string, tableId: string) => `/${tenant}/table/${tableId}`,
    TABLE_PATTERN: '/:tenant/table/:tableId',
  },

  ADMIN: {
    LIVE_ORDERS: (tenant: string) => `/${tenant}/app-live-orders`,
    KDS: (tenant: string) => `/${tenant}/app-kds`,
    WAITER_HUB: (tenant: string) => `/${tenant}/app-waiter-hub`,
    BILLING: (tenant: string) => `/${tenant}/app-billing`,
    MENU: (tenant: string) => `/${tenant}/app-menu`,
    MENU_ITEM: (tenant: string, id: string) => `/${tenant}/app-menu/${id}`,
    CATEGORIES: (tenant: string) => `/${tenant}/app-categories`,
    TABLES: (tenant: string) => `/${tenant}/app-tables`,
    TABLE: (tenant: string, id: string) => `/${tenant}/app-tables/${id}`,
    STAFF: (tenant: string) => `/${tenant}/app-staff`,
    STAFF_MEMBER: (tenant: string, id: string) => `/${tenant}/app-staff/${id}`,
    SETTINGS: (tenant: string) => `/${tenant}/app-settings`,
    PROFILE: (tenant: string) => `/${tenant}/app-profile`,
  },

  SUPER_ADMIN: {
    ROOT: '/super-admin',
    RESTAURANTS: '/super-admin/restaurants',
    RESTAURANT: (id: string) => `/super-admin/restaurants/${id}`,
  },

  LEGACY: {
    KITCHEN: '/kitchen',
    WAITER: '/waiter',
    LOGIN: '/login',
    CUSTOMER_V1: (tenant: string, tableId: string) => `/r/${tenant}/table/${tableId}`,
    ADMIN_DASHBOARD: '/admin/dashboard',
    ADMIN_DASHBOARD_PAGE: (page: string) => `/admin/dashboard/${page}`,
  },
} as const;

export const getAdminDefaultRoute = (role: string, tenant: string): string => {
  switch (role) {
    case 'KITCHEN_STAFF':
      return ROUTES.ADMIN.KDS(tenant);
    case 'WAITER':
      return ROUTES.ADMIN.WAITER_HUB(tenant);
    case 'CASHIER':
      return ROUTES.ADMIN.BILLING(tenant);
    default:
      return ROUTES.ADMIN.LIVE_ORDERS(tenant);
  }
};

const SKIP_TENANT_PREFIXES = new Set([
  'auth', 'super-admin', '_next', 'api',
]);

export const extractTenantSlug = (pathname: string): string | null => {
  const firstSegment = pathname.split('/')[1];
  if (!firstSegment || SKIP_TENANT_PREFIXES.has(firstSegment)) return null;
  const isSluggedRoute = /^\/(?:[^/]+)\/(?:menu|table|admin|app-)/.test(pathname);
  return isSluggedRoute ? firstSegment : null;
};

export const isCustomerRoute = (pathname: string): boolean => {
  return extractTenantSlug(pathname) !== null;
};
