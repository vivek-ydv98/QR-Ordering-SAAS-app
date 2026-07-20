import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('lucide-react', () => ({
  Loader2: () => null,
  RefreshCw: () => null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
    span: ({ children, ...props }: any) => React.createElement('span', props, children),
    svg: ({ children, ...props }: any) => React.createElement('svg', props, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('LoadingComponents', () => {
  it('renders PageLoader with message', async () => {
    const { PageLoader } = await import('../../../src/components/LoadingComponents');
    render(React.createElement(PageLoader, { message: 'Loading...', theme: 'admin' }));
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders ButtonLoader with children when not loading', async () => {
    const { ButtonLoader } = await import('../../../src/components/LoadingComponents');
    render(
      React.createElement(
        ButtonLoader,
        { loading: false },
        React.createElement('span', null, 'Click Me')
      )
    );
    expect(screen.getByText('Click Me')).toBeDefined();
  });
});
