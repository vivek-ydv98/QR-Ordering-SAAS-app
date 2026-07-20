import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, SelectedCustomization } from '../types';

export const generateCartItemId = (
  menuItemId: string,
  customizations: SelectedCustomization[]
): string => {
  if (customizations.length === 0) return menuItemId;
  const sortedOptionIds = [...customizations]
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((c) => c.optionId)
    .join('-');
  return `${menuItemId}-${sortedOptionIds}`;
};

interface CartState {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'cartItemId'>) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  getTotals: (taxRates: {
    cgst: number | null;
    sgst: number | null;
    serviceCharge: number | null;
  }) => {
    subtotal: number;
    cgst: number | null;
    sgst: number | null;
    serviceCharge: number | null;
    grandTotal: number;
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (newItem) => {
        const cartItemId = generateCartItemId(newItem.menuItemId, newItem.customizations);
        const existingCart = get().cart;
        const existingIndex = existingCart.findIndex((item) => item.cartItemId === cartItemId);

        if (existingIndex > -1) {
          const updatedCart = [...existingCart];
          updatedCart[existingIndex].quantity += newItem.quantity;
          set({ cart: updatedCart });
        } else {
          set({ cart: [...existingCart, { ...newItem, cartItemId }] });
        }
      },

      removeFromCart: (cartItemId) => {
        set({ cart: get().cart.filter((item) => item.cartItemId !== cartItemId) });
      },

      updateQuantity: (cartItemId, delta) => {
        const updatedCart = get().cart
          .map((item) => {
            if (item.cartItemId === cartItemId) {
              const newQty = item.quantity + delta;
              return { ...item, quantity: newQty };
            }
            return item;
          })
          .filter((item) => item.quantity > 0);
        set({ cart: updatedCart });
      },

      clearCart: () => set({ cart: [] }),

      getTotals: (taxRates) => {
        const cart = get().cart;
        const subtotal = cart.reduce((acc, item) => {
          const itemPrice = item.basePrice + item.customizationPrice;
          return acc + itemPrice * item.quantity;
        }, 0);

        const cgst = taxRates.cgst !== null ? subtotal * (taxRates.cgst / 100) : null;
        const sgst = taxRates.sgst !== null ? subtotal * (taxRates.sgst / 100) : null;
        const serviceCharge = taxRates.serviceCharge !== null ? subtotal * (taxRates.serviceCharge / 100) : null;
        const grandTotal = subtotal + (cgst ?? 0) + (sgst ?? 0) + (serviceCharge ?? 0);

        return {
          subtotal,
          cgst,
          sgst,
          serviceCharge,
          grandTotal,
        };
      },
    }),
    {
      name: 'qr-cart-storage',
    }
  )
);
