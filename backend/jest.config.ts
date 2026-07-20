import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/tests'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.module.ts$',
    'main.ts',
    '.dto.ts$',
    '.strategy.ts$',
  ],
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  setupFiles: ['<rootDir>/tests/setup/jest.ts'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 65,
      lines: 70,
    },
  },
};

export default config;
