---
name: api-endpoint-creator
description: "Use this skill when creating API endpoints for the finance app backend. Triggers: user asks to create/modify endpoints, mentions 'API', 'endpoint', 'route', 'controller', 'service', or any backend REST functionality. Ensures module structure, Zod validation, error handling, authentication, caching, and security best practices."
---

# API Endpoint Creator Skill

## When to Use This Skill

**ALWAYS use this skill when:**

- Creating new API endpoints
- Modifying existing endpoints
- User mentions: "API", "endpoint", "route", "create endpoint", "backend"
- Working with controllers, services, repositories
- Implementing CRUD operations
- Adding authentication/authorization

---

## Module Structure

Each backend module follows this pattern:

```
src/modules/transactions/
├── transaction.controller.ts   # HTTP handlers, Zod validation
├── transaction.service.ts      # Business logic
├── transaction.repository.ts   # Database queries (Prisma)
├── transaction.types.ts        # TypeScript types/interfaces
├── transaction.routes.ts       # Express routes
└── __tests__/
    ├── transaction.controller.test.ts
    ├── transaction.service.test.ts
    └── transaction.integration.test.ts
```

**Responsibilities:**

- **Controller:** Handle HTTP, validate with Zod, return responses
- **Service:** Business logic, orchestration, external calls
- **Repository:** Database queries only, data transformation

---

## Endpoint Template

### 1. Define Types

```typescript
// transaction.types.ts
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  categoryId: string;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionDTO {
  amount: number;
  currency: string;
  categoryId: string;
  description?: string;
  date: string; // ISO 8601
}

export interface UpdateTransactionDTO {
  amount?: number;
  categoryId?: string;
  description?: string;
  date?: string;
}
```

### 2. Define Zod Schemas (Controller)

```typescript
// transaction.controller.ts
import { z } from 'zod';
import { Request, Response } from 'express';
import { transactionService } from './transaction.service';

// Validation schemas
const createTransactionSchema = z.object({
  amount: z.number().positive().max(999999999, 'Amount too large'),
  currency: z.string().length(3, 'Currency must be 3 letters (e.g., USD)'),
  categoryId: z.string().uuid('Invalid category ID'),
  description: z.string().max(500, 'Description too long').optional(),
  date: z.string().datetime('Invalid date format'),
});

const updateTransactionSchema = z
  .object({
    amount: z.number().positive().max(999999999).optional(),
    categoryId: z.string().uuid().optional(),
    description: z.string().max(500).optional(),
    date: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const transactionIdSchema = z.object({
  id: z.string().uuid('Invalid transaction ID'),
});

const listTransactionsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['expense', 'income']).optional(),
});
```

### 3. Implement Controller

```typescript
// transaction.controller.ts (continued)

/**
 * Get all transactions for authenticated user with optional filters
 * GET /api/v1/transactions?page=1&limit=20&startDate=...
 */
export async function getTransactions(req: Request, res: Response) {
  try {
    // Validate query params
    const query = listTransactionsSchema.parse(req.query);

    // Call service
    const result = await transactionService.list(req.user.id, {
      page: query.page || 1,
      limit: query.limit || 20,
      startDate: query.startDate,
      endDate: query.endDate,
      categoryId: query.categoryId,
      type: query.type,
    });

    // Return success
    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Create new transaction
 * POST /api/v1/transactions
 */
export async function createTransaction(req: Request, res: Response) {
  try {
    // Validate request body
    const validated = createTransactionSchema.parse(req.body);

    // Call service
    const transaction = await transactionService.create(req.user.id, validated);

    // Return created resource
    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Update transaction
 * PUT /api/v1/transactions/:id
 */
export async function updateTransaction(req: Request, res: Response) {
  try {
    // Validate params and body
    const { id } = transactionIdSchema.parse(req.params);
    const validated = updateTransactionSchema.parse(req.body);

    // Call service
    const transaction = await transactionService.update(id, req.user.id, validated);

    // Return updated resource
    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Delete transaction
 * DELETE /api/v1/transactions/:id
 */
export async function deleteTransaction(req: Request, res: Response) {
  try {
    // Validate params
    const { id } = transactionIdSchema.parse(req.params);

    // Call service
    await transactionService.delete(id, req.user.id);

    // Return no content
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Centralized error handler for controllers
 */
function handleControllerError(error: unknown, res: Response) {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data',
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Custom application errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Unexpected errors
  console.error('Unexpected error:', error);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
  });
}
```

### 4. Implement Service (Business Logic)

```typescript
// transaction.service.ts
import { transactionRepository } from './transaction.repository';
import { redis } from '@/lib/redis';
import { categorizeTransaction } from '@/utils/categorization';
import { AppError, NotFoundError, ForbiddenError } from '@/lib/errors';

class TransactionService {
  /**
   * List transactions with pagination and filters
   */
  async list(userId: string, options: ListOptions) {
    const { page, limit, startDate, endDate, categoryId, type } = options;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Fetch from repository
    const [transactions, total] = await Promise.all([
      transactionRepository.findMany({
        userId,
        startDate,
        endDate,
        categoryId,
        type,
        limit,
        offset,
      }),
      transactionRepository.count({
        userId,
        startDate,
        endDate,
        categoryId,
        type,
      }),
    ]);

    return { transactions, total, page, limit };
  }

  /**
   * Create new transaction with auto-categorization
   */
  async create(userId: string, data: CreateTransactionDTO) {
    // Auto-categorize if no category provided
    let categoryId = data.categoryId;
    if (!categoryId && data.description) {
      categoryId = await categorizeTransaction(userId, data.description);
    }

    // Create transaction
    const transaction = await transactionRepository.create({
      userId,
      ...data,
      categoryId,
      type: 'expense', // Default to expense
      date: new Date(data.date),
    });

    // Invalidate user's dashboard cache
    await this.invalidateUserCache(userId);

    return transaction;
  }

  /**
   * Update transaction with ownership check
   */
  async update(id: string, userId: string, data: UpdateTransactionDTO) {
    // Check ownership
    const existing = await transactionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this transaction');
    }

    // Update
    const transaction = await transactionRepository.update(id, {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    });

    // Invalidate cache
    await this.invalidateUserCache(userId);

    return transaction;
  }

  /**
   * Delete transaction with ownership check
   */
  async delete(id: string, userId: string) {
    // Check ownership
    const existing = await transactionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this transaction');
    }

    // Soft delete
    await transactionRepository.softDelete(id);

    // Invalidate cache
    await this.invalidateUserCache(userId);
  }

  /**
   * Invalidate user's cached dashboard data
   */
  private async invalidateUserCache(userId: string) {
    await redis.del(`dashboard:${userId}`);
    await redis.del(`stats:${userId}`);
  }
}

export const transactionService = new TransactionService();
```

### 5. Implement Repository (Database)

```typescript
// transaction.repository.ts
import { prisma } from '@/lib/prisma';

class TransactionRepository {
  /**
   * Find many transactions with filters
   */
  async findMany(filters: FindManyFilters) {
    const { userId, startDate, endDate, categoryId, type, limit, offset } = filters;

    return prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null, // Exclude soft-deleted
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
        ...(categoryId && { categoryId }),
        ...(type && { type }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Count transactions with filters
   */
  async count(filters: CountFilters) {
    const { userId, startDate, endDate, categoryId, type } = filters;

    return prisma.transaction.count({
      where: {
        userId,
        deletedAt: null,
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
        ...(categoryId && { categoryId }),
        ...(type && { type }),
      },
    });
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  /**
   * Create new transaction
   */
  async create(data: CreateData) {
    return prisma.transaction.create({
      data,
      include: {
        category: true,
      },
    });
  }

  /**
   * Update transaction
   */
  async update(id: string, data: UpdateData) {
    return prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Soft delete transaction
   */
  async softDelete(id: string) {
    return prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const transactionRepository = new TransactionRepository();
```

### 6. Define Routes

```typescript
// transaction.routes.ts
import express from 'express';
import { authenticate } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import * as transactionController from './transaction.controller';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// List transactions
router.get('/', transactionController.getTransactions);

// Create transaction
router.post('/', rateLimit({ max: 100, windowMs: 60000 }), transactionController.createTransaction);

// Get single transaction
router.get('/:id', transactionController.getTransaction);

// Update transaction
router.put('/:id', transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

export default router;
```

---

## Critical Rules

### Validation

✅ **Always validate in controller** using Zod schemas
✅ **Validate params, body, and query separately**
✅ **Return user-friendly error messages**
❌ **Never trust client input without validation**

### Error Handling

✅ **Use custom error classes** (AppError, NotFoundError, ForbiddenError)
✅ **Centralized error handler** in controller
✅ **Log unexpected errors** to console/Sentry
✅ **Never expose stack traces** to client in production
❌ **Never return database errors** directly to client

### Security

✅ **Always check ownership** before update/delete
✅ **Use soft deletes** for financial data
✅ **Rate limit** write operations
✅ **Sanitize inputs** (Zod handles this)
❌ **Never expose other users' data**
❌ **Never skip authentication checks**

### Caching

✅ **Cache expensive queries** in Redis
✅ **Invalidate cache** after mutations
✅ **Use descriptive cache keys** (`dashboard:${userId}`)
✅ **Set appropriate TTL** (5min for stats, 24h for exchange rates)

### Response Format

✅ **Consistent structure:** `{ success: true, data: {...} }`
✅ **Include pagination** for lists
✅ **201 for creation**, 204 for deletion, 200 for everything else
❌ **Never return inconsistent formats**

---

## Common Patterns

### Pagination

```typescript
const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 20;
const offset = (page - 1) * limit;

const [items, total] = await Promise.all([
  repository.findMany({ limit, offset }),
  repository.count(),
]);

res.json({
  success: true,
  data: items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});
```

### Caching with Redis

```typescript
// Check cache first
const cacheKey = `stats:${userId}:${period}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// Compute if not cached
const stats = await computeExpensiveStats(userId, period);

// Cache for 5 minutes
await redis.set(cacheKey, JSON.stringify(stats), 'EX', 300);

return stats;
```

### Ownership Check

```typescript
const resource = await repository.findById(id);
if (!resource) {
  throw new NotFoundError('Resource not found');
}
if (resource.userId !== req.user.id) {
  throw new ForbiddenError('Access denied');
}
```

---

## Custom Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Invalid input') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}
```

---

## Testing

### Unit Test (Service)

```typescript
// transaction.service.test.ts
describe('TransactionService', () => {
  it('should create transaction and invalidate cache', async () => {
    const mockCreate = jest.spyOn(transactionRepository, 'create');
    const mockRedis = jest.spyOn(redis, 'del');

    await transactionService.create('user-123', {
      amount: 50,
      currency: 'USD',
      categoryId: 'cat-123',
      date: '2026-02-07T12:00:00Z',
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(mockRedis).toHaveBeenCalledWith('dashboard:user-123');
  });
});
```

### Integration Test

```typescript
// transaction.integration.test.ts
import request from 'supertest';
import { app } from '@/app';

describe('POST /api/v1/transactions', () => {
  it('should create transaction with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        amount: 50,
        currency: 'USD',
        categoryId: 'cat-123',
        description: 'Lunch',
        date: '2026-02-07T12:00:00Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe(50);
  });

  it('should return 400 for invalid amount', async () => {
    const response = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        amount: -50, // Invalid
        currency: 'USD',
        categoryId: 'cat-123',
        date: '2026-02-07T12:00:00Z',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

---

## Checklist

- [ ] Zod validation in controller
- [ ] Business logic in service (not controller)
- [ ] Database queries in repository only
- [ ] Ownership checks before mutations
- [ ] Soft deletes for financial data
- [ ] Cache invalidation after mutations
- [ ] Consistent response format
- [ ] User-friendly error messages
- [ ] Rate limiting on write endpoints
- [ ] Authentication middleware applied
- [ ] Integration tests for critical flows
- [ ] Proper HTTP status codes
