// Only mock Prisma/Redis for unit tests (not integration tests)
// Integration tests use real database connections
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';

if (!isIntegrationTest) {
  // Mock Prisma client
  jest.mock('../lib/prisma', () => ({
    prisma: {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
      recurringTransaction: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    },
  }));

  // Mock Redis
  jest.mock('../lib/redis', () => ({
    redis: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    },
  }));
}

// Mock logger (always, to keep test output clean)
jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
