import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  InternalServerError,
} from '../../../../backend/src/common/errors/app-error';

describe('AppError hierarchy', () => {
  describe('AppError (base)', () => {
    it('creates with custom status, code, and message', () => {
      const err = new AppError('Custom message', 418, 'CUSTOM_CODE');
      expect(err.statusCode).toBe(418);
      expect(err.errorCode).toBe('CUSTOM_CODE');
      expect(err.message).toBe('Custom message');
      expect(err.field).toBeUndefined();
    });

    it('creates with optional field', () => {
      const err = new AppError('Field error', 400, 'FIELD_ERROR', 'email');
      expect(err.field).toBe('email');
    });
  });

  describe('ValidationError', () => {
    it('has status 400 and code VALIDATION_ERROR', () => {
      const err = new ValidationError('Invalid input', 'email');
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe('VALIDATION_ERROR');
      expect(err.field).toBe('email');
    });
  });

  describe('NotFoundError', () => {
    it('has status 404 and code NOT_FOUND', () => {
      const err = new NotFoundError('Order not found');
      expect(err.statusCode).toBe(404);
      expect(err.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('UnauthorizedError', () => {
    it('has status 401 and code UNAUTHORIZED', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.errorCode).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Please login again');
    });
  });

  describe('ForbiddenError', () => {
    it('has status 403 and default message', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.errorCode).toBe('FORBIDDEN');
      expect(err.message).toContain('permission');
    });
  });

  describe('ConflictError', () => {
    it('has status 409 and code CONFLICT', () => {
      const err = new ConflictError('Duplicate slug');
      expect(err.statusCode).toBe(409);
      expect(err.errorCode).toBe('CONFLICT');
    });
  });

  describe('RateLimitError', () => {
    it('has status 429 and code RATE_LIMIT_ERROR', () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
      expect(err.errorCode).toBe('RATE_LIMIT_ERROR');
    });
  });

  describe('DatabaseError', () => {
    it('has status 500 and code DATABASE_ERROR', () => {
      const err = new DatabaseError('Connection failed');
      expect(err.statusCode).toBe(500);
      expect(err.errorCode).toBe('DATABASE_ERROR');
    });
  });

  describe('InternalServerError', () => {
    it('has status 500 and default message', () => {
      const err = new InternalServerError();
      expect(err.statusCode).toBe(500);
      expect(err.errorCode).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
