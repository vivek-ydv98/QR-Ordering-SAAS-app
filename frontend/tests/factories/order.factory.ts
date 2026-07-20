import type { KOT, KOTItem, OrderStatus } from '@/types';

export const buildKOTItem = (overrides: Partial<KOTItem> = {}): KOTItem => ({
  name: 'Paneer Tikka',
  quantity: 2,
  price: 250,
  isVeg: true,
  customizations: [],
  ...overrides,
});

export const buildKOT = (overrides: Partial<KOT> = {}): KOT => ({
  id: 'order-uuid',
  kotNumber: '#1001',
  tableId: 'table-uuid',
  tableName: 'T1',
  createdAt: new Date().toISOString(),
  elapsedMinutes: 5,
  status: 'PENDING' as OrderStatus,
  items: [buildKOTItem()],
  subtotal: 500,
  cgst: 12.5,
  sgst: 12.5,
  serviceCharge: 25.0,
  cgstRate: 2.5,
  sgstRate: 2.5,
  serviceChargeRate: 5.0,
  grandTotal: 550,
  ...overrides,
});
