export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type WaiterRequestType = 'water' | 'bill' | 'service' | 'cutlery';

export interface TenantTheme {
  primary: string; // HSL values, e.g. "142.1 76.2% 36.3%"
  primaryForeground: string;
  secondary: string;
  background: string;
  foreground: string;
  radius: string; // e.g. "0.75rem"
}

export interface TenantConfig {
  isVegOnly: boolean;
  allowUpiPayments: boolean;
  allowWaiterCall: boolean;
  taxRates: {
    cgst: number; // percentage
    sgst: number; // percentage
    serviceCharge: number; // percentage
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  theme: TenantTheme;
  config: TenantConfig;
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: CustomizationOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  categoryId: string;
  customizationGroups: CustomizationGroup[];
}

export interface Category {
  id: string;
  name: string;
  isAvailable: boolean;
  sortOrder: number;
}

export interface SelectedCustomization {
  optionId: string;
  optionName: string;
  price: number;
  groupId: string;
  groupName: string;
}

export interface CartItem {
  cartItemId: string; // Composition hash: menuItemId-sortedOptionIds
  menuItemId: string;
  name: string;
  basePrice: number;
  customizationPrice: number;
  quantity: number;
  customizations: SelectedCustomization[];
  specialInstructions: string;
}

export interface Table {
  id: string;
  name: string; // e.g. "Table 3" or "T3"
  status: 'VACANT' | 'OCCUPIED';
  currentSessionId?: string;
}

export interface KOTItem {
  name: string;
  quantity: number;
  isVeg: boolean;
  customizations: string[]; // Formatted customizations text, e.g., "Extra Cheese, Large"
}

export interface KOT {
  id: string;
  kotNumber: string; // e.g., "#1001"
  tableId: string;
  tableName: string;
  createdAt: string; // ISO String
  elapsedMinutes: number;
  status: OrderStatus;
  items: KOTItem[];
  specialInstructions?: string;
}

export interface WaiterCall {
  id: string;
  tableId: string;
  tableName: string;
  requestType: WaiterRequestType;
  timestamp: string; // ISO String
  isResolved: boolean;
}

export interface PlatformMetrics {
  totalOrdersToday: number;
  activeRestaurants: number;
  activeTables: number;
  ordersByRestaurant?: { restaurantId: string; count: number }[];
}
