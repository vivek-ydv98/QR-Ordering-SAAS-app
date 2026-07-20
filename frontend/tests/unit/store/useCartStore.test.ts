import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../../../frontend/src/store/useCartStore';

const baseItem = {
  menuItemId: 'item-1',
  name: 'Paneer Tikka',
  basePrice: 250,
  customizationPrice: 0,
  quantity: 1,
  customizations: [],
  specialInstructions: '',
};

const defaultTaxRates = { cgst: 2.5, sgst: 2.5, serviceCharge: 5.0 };

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.persist.clearStorage();
    useCartStore.setState({ cart: [] });
  });

  describe('addToCart', () => {
    it('adds a new item to cart', () => {
      const store = useCartStore.getState();
      store.addToCart(baseItem);
      expect(useCartStore.getState().cart).toHaveLength(1);
      expect(useCartStore.getState().cart[0].name).toBe('Paneer Tikka');
    });

    it('increments quantity for duplicate item', () => {
      const store = useCartStore.getState();
      store.addToCart(baseItem);
      store.addToCart(baseItem);
      expect(useCartStore.getState().cart).toHaveLength(1);
      expect(useCartStore.getState().cart[0].quantity).toBe(2);
    });

    it('treats items with different customizations as separate', () => {
      const store = useCartStore.getState();
      const itemA = { ...baseItem, customizations: [{ optionId: 'o1', optionName: 'Extra Cheese', price: 30, groupId: 'g1', groupName: 'Addons' }] };
      const itemB = { ...baseItem, customizations: [{ optionId: 'o2', optionName: 'No Onion', price: 0, groupId: 'g1', groupName: 'Addons' }] };
      store.addToCart(itemA);
      store.addToCart(itemB);
      expect(useCartStore.getState().cart).toHaveLength(2);
    });
  });

  describe('removeFromCart', () => {
    it('removes item by cartItemId', () => {
      const store = useCartStore.getState();
      store.addToCart(baseItem);
      const itemId = useCartStore.getState().cart[0].cartItemId;
      store.removeFromCart(itemId);
      expect(useCartStore.getState().cart).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('updates item quantity', () => {
      const store = useCartStore.getState();
      store.addToCart(baseItem);
      const itemId = useCartStore.getState().cart[0].cartItemId;
      store.updateQuantity(itemId, 4);
      expect(useCartStore.getState().cart[0].quantity).toBe(5);
    });

    it('removes item when quantity is 0', () => {
      const store = useCartStore.getState();
      store.addToCart(baseItem);
      const itemId = useCartStore.getState().cart[0].cartItemId;
      store.updateQuantity(itemId, -1);
      expect(useCartStore.getState().cart).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('removes all items', () => {
      const store = useCartStore.getState();
      store.addToCart(baseItem);
      store.addToCart({ ...baseItem, menuItemId: 'item-2', name: 'Dal Makhani' });
      store.clearCart();
      expect(useCartStore.getState().cart).toHaveLength(0);
    });
  });

  describe('getTotals', () => {
    it('calculates subtotal correctly', () => {
      const store = useCartStore.getState();
      store.addToCart({ ...baseItem, quantity: 2, basePrice: 250 });
      store.addToCart({ ...baseItem, menuItemId: 'item-2', name: 'Naan', quantity: 1, basePrice: 50 });
      const totals = store.getTotals(defaultTaxRates);
      expect(totals.subtotal).toBe(550);
    });

    it('returns zeros for empty cart', () => {
      const totals = useCartStore.getState().getTotals(defaultTaxRates);
      expect(totals).toEqual({
        subtotal: 0,
        cgst: 0,
        sgst: 0,
        serviceCharge: 0,
        grandTotal: 0,
      });
    });
  });
});
