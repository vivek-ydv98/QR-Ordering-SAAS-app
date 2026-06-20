import { ValidationError } from '../common/errors/app-error';
import { OrderStatus } from '@prisma/client';

export class OrderStateMachine {
  // Map of valid next transitions
  private static readonly transitionMap: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready'],
    ready: ['served'],
    served: ['completed'],
    completed: [], // Terminal State
    cancelled: [], // Terminal State
  };

  /**
   * Validates a status transition. Throws a ValidationError if invalid.
   */
  public static validateTransition(current: OrderStatus, target: OrderStatus): void {
    const validTransitions = this.transitionMap[current];

    if (!validTransitions) {
      throw new ValidationError(`Order state transition error: Unknown status "${current}".`, 'status');
    }

    if (!validTransitions.includes(target)) {
      throw new ValidationError(
        `Invalid order status transition. Cannot change order status from "${current}" to "${target}". Valid steps: [${validTransitions.join(', ')}]`,
        'status'
      );
    }
  }

  /**
   * Helper to check if a state is terminal.
   */
  public static isTerminal(status: OrderStatus): boolean {
    return status === 'completed' || status === 'cancelled';
  }
}
