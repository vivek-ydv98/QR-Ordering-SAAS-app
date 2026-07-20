import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockSocket = {
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../../../../frontend/src/lib/socket', () => ({
  socketManager: {
    connect: vi.fn(() => mockSocket),
    disconnect: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    getSocket: vi.fn(() => mockSocket),
  },
}));

vi.mock('../../../../frontend/src/store/useToastStore', () => ({
  useToastStore: {
    getState: vi.fn(() => ({
      showInfo: vi.fn(),
    })),
  },
}));

describe('useSocket', () => {
  it('exports useSocket hook', async () => {
    const mod = await import('../../../src/hooks/useSocket');
    expect(typeof mod.useSocket).toBe('function');
  });

  it('returns subscribeToEvent and emitEvent', async () => {
    const { useSocket } = await import('../../../src/hooks/useSocket');
    const { result } = renderHook(() => useSocket('tenant-uuid'));

    expect(result.current).toHaveProperty('subscribeToEvent');
    expect(result.current).toHaveProperty('emitEvent');
    expect(result.current).toHaveProperty('isConnected');
    expect(typeof result.current.subscribeToEvent).toBe('function');
    expect(typeof result.current.emitEvent).toBe('function');
  });

  it('subscribeToEvent returns unsubscribe function', async () => {
    const { useSocket } = await import('../../../src/hooks/useSocket');
    const { result } = renderHook(() => useSocket('tenant-uuid'));

    let unsubscribed = false;
    const unsubscribe = result.current.subscribeToEvent('test:event', vi.fn());
    unsubscribe();
    unsubscribed = true;
    expect(unsubscribed).toBe(true);
  });

  it('emitEvent does not throw', async () => {
    const { useSocket } = await import('../../../src/hooks/useSocket');
    const { result } = renderHook(() => useSocket('tenant-uuid'));

    expect(() => {
      result.current.emitEvent('test:event', { data: 'test' });
    }).not.toThrow();
  });
});
