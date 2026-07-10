export const buildUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-uuid',
  restaurantId: 'restaurant-uuid',
  fullName: 'Test User',
  email: 'test@example.com',
  passwordHash: '$2a$10$hashedpassword',
  role: 'RESTAURANT_ADMIN',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

export const buildSuperAdmin = (overrides: Record<string, any> = {}) =>
  buildUser({ role: 'SUPER_ADMIN', restaurantId: null, ...overrides });
