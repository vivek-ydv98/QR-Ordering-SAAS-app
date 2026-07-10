import type { Tenant, TenantConfig, TenantTheme, MenuItem, Category } from '@/types';

export const buildTenantTheme = (overrides: Partial<TenantTheme> = {}): TenantTheme => ({
  primary: '142.1 76.2% 36.3%',
  primaryForeground: '355.7 100% 97.3%',
  secondary: '142.1 76.2% 36.3%',
  background: '20 14.3% 4.1%',
  foreground: '60 9.1% 97.8%',
  radius: '0.75rem',
  ...overrides,
});

export const buildTenantConfig = (overrides: Partial<TenantConfig> = {}): TenantConfig => ({
  isVegOnly: false,
  allowUpiPayments: true,
  allowWaiterCall: true,
  allowedFoodTypes: ['VEG', 'NON_VEG', 'EGG'],
  taxRates: { cgst: 2.5, sgst: 2.5, serviceCharge: 5.0 },
  ...overrides,
});

export const buildTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: 'restaurant-uuid',
  name: 'Tandoori Palace',
  slug: 'tandoori-palace',
  logoUrl: undefined,
  theme: buildTenantTheme(),
  config: buildTenantConfig(),
  ...overrides,
});

export const buildMenuItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: 'menu-item-uuid',
  name: 'Paneer Tikka',
  description: 'Chargrilled cottage cheese',
  price: 250,
  isVeg: true,
  foodType: 'VEG',
  isAvailable: true,
  imageUrl: undefined,
  categoryId: 'category-uuid',
  customizationGroups: [],
  ...overrides,
});

export const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-uuid',
  name: 'Starters',
  isAvailable: true,
  sortOrder: 0,
  ...overrides,
});
