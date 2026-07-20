import { describe, it, expect } from 'vitest';
import api from '../../../../frontend/src/lib/api';

describe('api client', () => {
  it('has baseURL configured', () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(typeof api.defaults.baseURL).toBe('string');
  });

  it('has timeout configured', () => {
    expect(api.defaults.timeout).toBeGreaterThan(0);
  });

  it('has request interceptors registered', () => {
    expect(api.interceptors.request.handlers.length).toBeGreaterThanOrEqual(1);
  });

  it('has response interceptors registered', () => {
    expect(api.interceptors.response.handlers.length).toBeGreaterThanOrEqual(1);
  });

  it('has standard HTTP methods', () => {
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.patch).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.delete).toBe('function');
  });
});
