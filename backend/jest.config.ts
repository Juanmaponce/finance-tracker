import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['.*\\.integration\\.test\\.ts$'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/modules/**/**.service.ts', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 45,
      statements: 45,
    },
  },
};

export default config;
