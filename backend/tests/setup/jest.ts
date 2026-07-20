process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '15m';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test';
