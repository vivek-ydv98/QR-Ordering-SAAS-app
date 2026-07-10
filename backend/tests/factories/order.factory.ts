import { OrderStatus } from '@prisma/client';

export const buildOrderItem = (overrides: Record<string, any> = {}) => ({
  id: 'order-item-uuid',
  orderId: 'order-uuid',
  menuItemId: 'menu-item-uuid',
  name: 'Paneer Tikka',
  quantity: 2,
  price: 250.0,
  customizations: [],
  createdAt: new Date(),
  ...overrides,
});

export const buildOrder = (overrides: Record<string, any> = {}) => ({
  id: 'order-uuid',
  restaurantId: 'restaurant-uuid',
  tableId: 'table-uuid',
  kotNumber: '#1001',
  status: 'pending' as OrderStatus,
  subtotal: 500.0,
  cgst: 12.5,
  sgst: 12.5,
  serviceCharge: 25.0,
  cgstRate: 2.5,
  sgstRate: 2.5,
  serviceChargeRate: 5.0,
  grandTotal: 550.0,
  specialInstructions: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [buildOrderItem()],
  table: { id: 'table-uuid', name: 'T1', status: 'OCCUPIED' },
  ...overrides,
});

export const buildKitchenTicket = (overrides: Record<string, any> = {}) => ({
  id: 'ticket-uuid',
  restaurantId: 'restaurant-uuid',
  orderId: 'order-uuid',
  kotNumber: '#1001',
  status: 'pending' as OrderStatus,
  elapsedMinutes: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
