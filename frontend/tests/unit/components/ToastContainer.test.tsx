import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastContainer } from '../../../../frontend/src/components/ToastContainer';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
  },
}));

vi.mock('lucide-react', () => ({
  CheckCircle2: () => null,
  AlertCircle: () => null,
  AlertTriangle: () => null,
  Info: () => null,
  X: () => null,
}));

import React from 'react';
import { useToastStore } from '../../../../frontend/src/store/useToastStore';

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(React.createElement(ToastContainer));
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders a success toast', () => {
    useToastStore.getState().showSuccess('Order placed successfully');
    render(React.createElement(ToastContainer));
    expect(screen.getByText('Order placed successfully')).toBeDefined();
  });

  it('renders an error toast', () => {
    useToastStore.getState().showError('Payment failed');
    render(React.createElement(ToastContainer));
    expect(screen.getByText('Payment failed')).toBeDefined();
  });

  it('renders a warning toast', () => {
    useToastStore.getState().showWarning('Low stock');
    render(React.createElement(ToastContainer));
    expect(screen.getByText('Low stock')).toBeDefined();
  });

  it('renders an info toast', () => {
    useToastStore.getState().showInfo('New order received');
    render(React.createElement(ToastContainer));
    expect(screen.getByText('New order received')).toBeDefined();
  });

  it('renders multiple toasts', () => {
    useToastStore.getState().showSuccess('First');
    useToastStore.getState().showError('Second');
    render(React.createElement(ToastContainer));
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });
});
