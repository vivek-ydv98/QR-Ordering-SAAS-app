import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../../../../frontend/src/lib/error-utils';

describe('getErrorMessage', () => {
  it('returns string errors directly', () => {
    expect(getErrorMessage('Something failed')).toBe('Something failed');
  });

  it('returns axios error response message', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: 'Invalid credentials',
        },
      },
    };
    expect(getErrorMessage(error)).toBe('Invalid credentials');
  });

  it('returns axios message for error without response data', () => {
    const error = {
      isAxiosError: true,
      message: 'Network Error',
    };
    expect(getErrorMessage(error)).toBe('Network Error');
  });

  it('returns generic message for ERR_NETWORK without message', () => {
    const error = {
      isAxiosError: true,
      code: 'ERR_NETWORK',
    };
    expect(getErrorMessage(error)).toContain('An unexpected error occurred');
  });

  it('handles Error objects with message', () => {
    const error = new Error('Custom error message');
    expect(getErrorMessage(error)).toBe('Custom error message');
  });

  it('handles null/undefined/unknown types', () => {
    const message = getErrorMessage(null);
    expect(message).toContain('An unexpected error occurred');
  });

  it('handles axios error with errorCode', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Email is required',
          field: 'email',
        },
      },
    };
    expect(getErrorMessage(error)).toBe('Email is required');
  });

  it('handles axios error with validation errors array', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: ['email must be an email', 'password too short'],
        },
      },
    };
    const message = getErrorMessage(error);
    expect(message).toContain('email must be an email');
  });

  it('handles generic object without message', () => {
    const error = {};
    expect(getErrorMessage(error)).toContain('An unexpected error occurred');
  });
});
