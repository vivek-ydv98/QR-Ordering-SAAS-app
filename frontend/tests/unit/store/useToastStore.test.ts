import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from '../../../../frontend/src/store/useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('starts with no toasts', () => {
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('adds a success toast', () => {
    useToastStore.getState().showSuccess('Operation completed');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('Operation completed');
  });

  it('adds an error toast', () => {
    useToastStore.getState().showError('Something went wrong');
    expect(useToastStore.getState().toasts[0].type).toBe('error');
  });

  it('adds a warning toast', () => {
    useToastStore.getState().showWarning('Be careful');
    expect(useToastStore.getState().toasts[0].type).toBe('warning');
  });

  it('adds an info toast', () => {
    useToastStore.getState().showInfo('For your information');
    expect(useToastStore.getState().toasts[0].type).toBe('info');
  });

  it('removes a toast by id', () => {
    useToastStore.getState().showSuccess('Test');
    const toastId = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(toastId);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('supports multiple toasts', () => {
    useToastStore.getState().showSuccess('First');
    useToastStore.getState().showError('Second');
    useToastStore.getState().showInfo('Third');
    expect(useToastStore.getState().toasts).toHaveLength(3);
  });
});
