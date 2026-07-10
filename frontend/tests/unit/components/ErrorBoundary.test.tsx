import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  RefreshCcw: () => null,
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', async () => {
    const { ErrorBoundary } = await import('../../../src/components/ErrorBoundary');
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement('div', null, 'Working Content')
      )
    );
    expect(screen.getByText('Working Content')).toBeDefined();
  });

  it('renders error UI when child throws', async () => {
    const { ErrorBoundary } = await import('../../../src/components/ErrorBoundary');

    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(ThrowingComponent)
      )
    );

    expect(screen.getByText(/Something went wrong/i)).toBeDefined();
    expect(screen.getByText('Reload Page')).toBeDefined();
  });
});
