import { OrderStateMachine } from '../../../../backend/src/orders/orders.state';

describe('OrderStateMachine', () => {
  describe('validateTransition', () => {
    const validCases = [
      ['pending', 'confirmed'],
      ['pending', 'cancelled'],
      ['confirmed', 'preparing'],
      ['confirmed', 'cancelled'],
      ['preparing', 'ready'],
      ['ready', 'served'],
      ['served', 'completed'],
    ] as const;

    test.each(validCases)('allows %s -> %s', (current, target) => {
      expect(() => OrderStateMachine.validateTransition(current, target)).not.toThrow();
    });

    const invalidCases = [
      ['pending', 'preparing'],
      ['pending', 'ready'],
      ['pending', 'served'],
      ['pending', 'completed'],
      ['confirmed', 'ready'],
      ['confirmed', 'served'],
      ['confirmed', 'completed'],
      ['preparing', 'confirmed'],
      ['preparing', 'served'],
      ['preparing', 'completed'],
      ['preparing', 'cancelled'],
      ['ready', 'confirmed'],
      ['ready', 'preparing'],
      ['ready', 'cancelled'],
      ['served', 'confirmed'],
      ['served', 'preparing'],
      ['served', 'ready'],
      ['served', 'cancelled'],
      ['completed', 'confirmed'],
      ['completed', 'preparing'],
      ['completed', 'ready'],
      ['completed', 'served'],
      ['completed', 'cancelled'],
      ['cancelled', 'confirmed'],
      ['cancelled', 'preparing'],
      ['cancelled', 'ready'],
      ['cancelled', 'served'],
      ['cancelled', 'completed'],
    ] as const;

    test.each(invalidCases)('rejects %s -> %s', (current, target) => {
      expect(() => OrderStateMachine.validateTransition(current, target)).toThrow();
    });
  });

  describe('isTerminal', () => {
    it('returns true for completed', () => {
      expect(OrderStateMachine.isTerminal('completed' as any)).toBe(true);
    });

    it('returns true for cancelled', () => {
      expect(OrderStateMachine.isTerminal('cancelled' as any)).toBe(true);
    });

    it('returns false for non-terminal states', () => {
      const nonTerminal = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
      for (const state of nonTerminal) {
        expect(OrderStateMachine.isTerminal(state as any)).toBe(false);
      }
    });
  });
});
