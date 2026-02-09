# CLAUDE.md - Personal Finance App

## Project Overview

You are working on a **mobile-first personal finance application** for expense tracking and savings management. This is a PWA (Progressive Web App) built with React + TypeScript on the frontend and Node.js + Express + TypeScript on the backend.

**Key characteristics:**

- Multi-currency support with manual data entry
- Automatic expense categorization
- Visual savings goals with separated funds
- Weekly/monthly/custom reports with comparison between periods
- Minimalist, professional design (Wise-inspired aesthetic)
- Dark mode support
- Receipt photo attachments (optional)
- Recurring expenses management

**Constraints:**

- Team: 1-2 developers
- Timeline: MVP in 2-3 months
- Budget: Limited (cost-efficient solutions prioritized)
- Security: Financial data requires ACID compliance and encryption

---

## Tech Stack

### Frontend

- **Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand (minimal boilerplate)
- **Data Fetching:** TanStack Query (automatic caching, revalidation)
- **Charts:** Recharts (responsive, mobile-friendly)
- **UI Framework:** Tailwind CSS + shadcn/ui
- **Validation:** Input sanitization on frontend, Zod validation on backend
- **PWA:** Service workers for offline support (MVP)

### Backend

- **Runtime:** Node.js + Express + TypeScript
- **ORM:** Prisma (type-safe queries, automatic migrations)
- **Database:** PostgreSQL (ACID compliance for financial data)
- **Cache:** Redis (Upstash - serverless, cost-efficient)
- **File Storage:** Cloudinary (automatic compression, CDN, generous free tier)
- **Cron Jobs:** node-cron (internal for MVP, migrate to Bull + Redis later)

### Infrastructure

- **Frontend Hosting:** Vercel (automatic deploys, CDN, HTTPS, PR previews)
- **Backend Hosting:** Railway (PostgreSQL + Redis + Node in one place)
- **Monitoring:** Sentry (error tracking), Pino (structured logging), Better Uptime (health checks)

---

## Architecture Principles

### 1. Modular Monolith

We start with a **modular monolith** (not microservices) to avoid operational complexity with a small team. Internal modularization allows extracting services in the future without rewriting.

**Backend modules:**

- `auth` - Authentication and authorization
- `transactions` - Expense/income CRUD and categorization
- `categories` - Category management
- `savings` - Savings goals and funds
- `reports` - Analytics and report generation
- `recurring` - Recurring transactions management
- `users` - User profile and settings

### 2. Atomic Design (Frontend)

Organize React components using Atomic Design methodology:

```
src/
├── components/
│   ├── atoms/          # Buttons, inputs, icons, badges
│   ├── molecules/      # Form fields, cards, stat displays
│   ├── organisms/      # Forms, charts, lists, navigation
│   ├── templates/      # Page layouts
│   └── pages/          # Full pages (dashboard, reports, settings)
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── services/           # API client functions
├── utils/              # Helper functions
└── types/              # TypeScript interfaces and types
```

### 3. Backend Module Structure

Each backend module follows this pattern:

```
src/modules/transactions/
├── transaction.controller.ts   # HTTP handlers, validation (Zod)
├── transaction.service.ts      # Business logic
├── transaction.repository.ts   # Database queries (Prisma)
├── transaction.types.ts        # TypeScript types
├── transaction.routes.ts       # Express routes
└── __tests__/                  # Tests
    ├── transaction.controller.test.ts
    ├── transaction.service.test.ts
    └── transaction.integration.test.ts
```

**Responsibilities:**

- **Controller:** Handle HTTP, validate inputs (Zod), return responses
- **Service:** Business logic, orchestration, external service calls
- **Repository:** Database queries, data transformation

---

## Code Standards

### General Principles

- **Atomic Functions:** Functions should do ONE thing and do it well. Max 30-50 lines per function.
- **Descriptive Short Names:** `getUserExpenses()` not `get()`, but avoid verbosity like `getUserExpensesFromDatabaseWithFiltering()`
- **Comments in English:** Use comments sparingly, only for complex logic or "why" explanations
- **TypeScript Strict Mode:** Always enabled, no `any` types unless absolutely necessary
- **DRY Principle:** Don't repeat yourself, extract reusable logic

### Naming Conventions

- **Files:** kebab-case (`transaction.service.ts`, `expense-card.tsx`)
- **Components:** PascalCase (`ExpenseCard`, `DashboardLayout`)
- **Functions/Variables:** camelCase (`getUserById`, `totalExpenses`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_CURRENCY`)
- **Interfaces/Types:** PascalCase with descriptive names (`Transaction`, `CreateExpenseDTO`)

### Code Style

- **Linting:** ESLint + Prettier (pre-commit hooks with Husky)
- **Imports:** Group by external/internal, alphabetically
- **Async/Await:** Preferred over raw promises for readability
- **Error Handling:** Always use try-catch for async operations

**Example:**

```typescript
// ✅ GOOD - Atomic, clear, typed
async function createExpense(userId: string, data: CreateExpenseDTO): Promise<Transaction> {
  const transaction = await prisma.transaction.create({
    data: { ...data, userId, type: 'expense' },
  });

  await invalidateUserCache(userId);
  return transaction;
}

// ❌ BAD - Too long, multiple responsibilities
async function createExpenseAndUpdateCacheAndNotifyUser(userId: string, data: any) {
  // 100+ lines of mixed concerns
}
```

---

## Validation Strategy

### Frontend (Input Sanitization)

- Sanitize all user inputs before sending to API
- Format numbers, dates, currencies
- Prevent XSS by escaping special characters
- Client-side validation for UX (instant feedback)

**Example:**

```typescript
// Sanitize amount input
const sanitizedAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
```

### Backend (Zod Validation)

- **All validation happens in controllers** using Zod schemas
- Validate request body, params, query strings
- Return friendly error messages (no custom error codes)

**Example:**

```typescript
// transaction.controller.ts
const createExpenseSchema = z.object({
  amount: z.number().positive().max(999999999),
  currency: z.string().length(3),
  categoryId: z.string().uuid(),
  description: z.string().max(500).optional(),
  date: z.string().datetime(),
});

export async function createExpense(req: Request, res: Response) {
  try {
    const validated = createExpenseSchema.parse(req.body);
    const transaction = await transactionService.create(req.user.id, validated);

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors,
      });
    }
    // Handle other errors
  }
}
```

---

## Error Handling

### API Response Format

**Success:**

```json
{
  "success": true,
  "data": {
    /* response payload */
  }
}
```

**Error:**

```json
{
  "success": false,
  "message": "User-friendly error message",
  "errors": [
    /* optional validation errors */
  ]
}
```

### Error Messages

- **User-friendly:** "Amount must be greater than zero" not "Validation failed on field 'amount'"
- **No custom error codes:** Use standard HTTP status codes (400, 401, 404, 500)
- **No stack traces in production:** Log detailed errors server-side, return generic messages to client

### Frontend Error Handling

- Use **toast notifications** for all user feedback (success, errors, warnings)
- Show specific error messages from API when available
- Fallback to generic "Something went wrong" for unexpected errors

**Example:**

```typescript
// Using react-hot-toast
import toast from 'react-hot-toast';

try {
  await createExpense(data);
  toast.success('Expense added successfully');
} catch (error) {
  toast.error(error.message || 'Failed to add expense');
}
```

---

## Testing Strategy

### Unit Tests (Critical Functions Only)

**Required for:**

- Financial calculations (totals, currency conversions, savings progress)
- Auto-categorization logic
- Date/period calculations for reports
- Data transformation functions

**Framework:** Vitest (frontend), Jest (backend)

**Coverage:** Minimum 70% on business logic (services)

**Example:**

```typescript
// transaction.service.test.ts
describe('TransactionService', () => {
  it('should calculate total expenses correctly', () => {
    const transactions = [
      { amount: 100, type: 'expense' },
      { amount: 50, type: 'expense' },
      { amount: 200, type: 'income' },
    ];

    const total = calculateTotalExpenses(transactions);
    expect(total).toBe(150);
  });
});
```

### Integration Tests (Critical Endpoints Only)

**Required for:**

- Auth endpoints (register, login, logout)
- Transaction CRUD
- Report generation
- Recurring transaction execution

**Framework:** Supertest + test database (Docker)

**Example:**

```typescript
// transaction.integration.test.ts
describe('POST /api/transactions', () => {
  it('should create expense with valid data', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        amount: 50.0,
        currency: 'USD',
        categoryId: categoryId,
        description: 'Lunch',
        date: '2026-02-07T12:00:00Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe(50.0);
  });
});
```

### E2E Tests (Critical Flows)

**Framework:** Playwright

**Flows to test:**

- User registration and login
- Create expense (with and without receipt)
- View dashboard and reports
- Create savings goal

---

## Database Schema

### Key Principles

- **UUID for all primary keys** (better for distributed systems)
- **TIMESTAMPTZ for all dates** (timezone-aware)
- **DECIMAL for money** (precision, never use FLOAT)
- **Soft deletes:** Add `deleted_at` column, never hard delete financial data
- **Indexes:** Add on foreign keys and frequently queried columns

### Critical Tables

**users**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  primary_currency CHAR(3) NOT NULL DEFAULT 'USD',
  dark_mode BOOLEAN DEFAULT false,
  locale VARCHAR(10) DEFAULT 'es',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**transactions**

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  category_id UUID REFERENCES categories(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_id UUID REFERENCES recurring_transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(type);
```

### Migrations

- **Prisma Migrate:** Automatic migration generation
- **Never destructive in production:** Don't drop columns immediately, deprecate first
- **Two-phase drops:**
  1. Stop using the field, deploy
  2. Drop field in next release

---

## API Design

### REST Principles

- **Versioning:** `/api/v1/...` (future-proof)
- **Pagination:** All list endpoints support `?page=1&limit=20`
- **Filtering:** Use query params `?category=food&startDate=2026-01-01`
- **Sorting:** `?sortBy=date&order=desc`

### Authentication

- **JWT tokens:** Access token (15min) + refresh token (7 days)
- **Header:** `Authorization: Bearer <token>`
- **Middleware:** Verify JWT on all protected routes

### Key Endpoints

**Auth**

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
```

**Transactions**

```
GET    /api/v1/transactions?page=1&limit=20&startDate=2026-01-01
POST   /api/v1/transactions
GET    /api/v1/transactions/:id
PUT    /api/v1/transactions/:id
DELETE /api/v1/transactions/:id
```

**Categories**

```
GET    /api/v1/categories
POST   /api/v1/categories
PUT    /api/v1/categories/:id
DELETE /api/v1/categories/:id
```

**Savings**

```
GET    /api/v1/savings
POST   /api/v1/savings
PUT    /api/v1/savings/:id
POST   /api/v1/savings/:id/deposit
DELETE /api/v1/savings/:id
```

**Reports**

```
GET    /api/v1/reports/summary?period=week|month&date=2026-02-07
GET    /api/v1/reports/comparison?period1=2026-01&period2=2026-02
GET    /api/v1/reports/export?format=pdf
```

**Recurring Transactions**

```
GET    /api/v1/recurring
POST   /api/v1/recurring
PUT    /api/v1/recurring/:id
PATCH  /api/v1/recurring/:id/toggle
DELETE /api/v1/recurring/:id
```

---

## Key Features Implementation

### 1. Automatic Categorization

**Logic:** Pattern matching against category keywords

**Location:** `transaction.service.ts`

**Flow:**

1. Extract keywords from transaction description (lowercase, remove accents)
2. Match against `categories.keywords` array
3. Return category with most keyword matches
4. Fall back to "Other" if no matches

**Example:**

```typescript
// transaction.service.ts
function autoCategorizе(description: string, categories: Category[]): string {
  const normalized = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const words = normalized.split(/\s+/);

  let bestMatch = { categoryId: null, score: 0 };

  for (const category of categories) {
    const matches = category.keywords.filter((keyword) =>
      words.some((word) => word.includes(keyword) || keyword.includes(word)),
    );

    if (matches.length > bestMatch.score) {
      bestMatch = { categoryId: category.id, score: matches.length };
    }
  }

  return bestMatch.categoryId || getDefaultCategoryId();
}
```

### 2. Multi-Currency Support

**Strategy:**

- Store all transactions in their original currency
- Convert to `primary_currency` for reports and aggregations
- Fetch exchange rates from external API (e.g., exchangerate-api.com)
- Cache rates in Redis (24h TTL)

**Implementation:**

```typescript
// currency.service.ts
async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;

  const cacheKey = `exchange_rate:${from}:${to}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return amount * parseFloat(cached);
  }

  const rate = await fetchExchangeRate(from, to);
  await redis.set(cacheKey, rate, 'EX', 86400); // 24h cache

  return amount * rate;
}
```

### 3. Recurring Transactions

**Cron Job:** Runs daily at 00:05 UTC

**Flow:**

1. Query active recurring transactions where `next_execution <= TODAY`
2. For each: create transaction, update `next_execution` based on frequency
3. Log successes/failures
4. Alert on errors via Sentry

**Example:**

```typescript
// cron/recurring-transactions.ts
import cron from 'node-cron';

cron.schedule('5 0 * * *', async () => {
  const recurring = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextExecution: { lte: new Date() },
    },
  });

  let processed = 0;
  let errors = 0;

  for (const template of recurring) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId: template.userId,
            amount: template.amount,
            currency: template.currency,
            categoryId: template.categoryId,
            description: template.description,
            date: new Date(),
            isRecurring: true,
            recurringId: template.id,
          },
        });

        await tx.recurringTransaction.update({
          where: { id: template.id },
          data: { nextExecution: calculateNextDate(template.frequency) },
        });
      });

      processed++;
    } catch (error) {
      errors++;
      logger.error(`Failed to process recurring transaction ${template.id}`, error);
    }
  }

  logger.info(
    `Processed ${processed}/${recurring.length} recurring transactions. Errors: ${errors}`,
  );

  if (errors > 0) {
    Sentry.captureMessage(`Recurring transactions cron had ${errors} errors`);
  }
});
```

### 4. PWA (Progressive Web App)

**Requirements:**

- Service worker for offline support
- Manifest.json for install prompt
- Cache critical assets and API responses

**Strategy:**

- Use Workbox for service worker generation
- Cache-first strategy for static assets
- Network-first strategy for API calls (with offline fallback)

**Vite config:**

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Finance Tracker',
        short_name: 'Finance',
        theme_color: '#00B9AE',
        icons: [
          /* ... */
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.yourdomain\.com\/api\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
});
```

---

## Performance Optimization

### Frontend

- **Code splitting:** Lazy load routes with `React.lazy()`
- **Image optimization:** Compress receipts before upload (Canvas API)
- **Skeleton loaders:** Show loading skeletons instead of spinners
- **Optimistic updates:** Update UI immediately for critical actions (create/delete expense)

**Example (Optimistic Update):**

```typescript
// Using TanStack Query
const mutation = useMutation({
  mutationFn: createExpense,
  onMutate: async (newExpense) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['transactions'] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['transactions']);

    // Optimistically update UI
    queryClient.setQueryData(['transactions'], (old) => [newExpense, ...old]);

    return { previous };
  },
  onError: (err, newExpense, context) => {
    // Rollback on error
    queryClient.setQueryData(['transactions'], context.previous);
    toast.error('Failed to add expense');
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
});
```

### Backend

- **Redis caching:** Cache dashboard stats, exchange rates
- **Query optimization:** Add indexes on frequently queried columns
- **Pagination:** Always paginate list endpoints
- **Connection pooling:** Prisma handles this automatically

**Cache example:**

```typescript
// report.service.ts
async function getDashboardStats(userId: string) {
  const cacheKey = `dashboard:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const stats = await calculateStats(userId);
  await redis.set(cacheKey, JSON.stringify(stats), 'EX', 300); // 5min cache

  return stats;
}

// Invalidate cache after creating transaction
async function createTransaction(userId: string, data: CreateTransactionDTO) {
  const transaction = await prisma.transaction.create({ data });
  await redis.del(`dashboard:${userId}`);
  return transaction;
}
```

---

## Security Best Practices

### Authentication

- **Password hashing:** bcrypt with 12 rounds
- **JWT secrets:** Store in environment variables, never commit
- **Token expiration:** Access token 15min, refresh token 7 days
- **HTTPS only:** Force HTTPS in production

### Input Validation

- **Frontend sanitization:** Remove special characters, format numbers
- **Backend validation:** Zod schemas in controllers
- **SQL injection prevention:** Prisma parameterized queries (built-in)
- **XSS prevention:** React escapes by default, be careful with `dangerouslySetInnerHTML`

### Data Protection

- **Environment variables:** Use `.env` files, never commit secrets
- **Rate limiting:** Express rate limiter on auth endpoints (5 requests/minute)
- **CORS:** Configure allowed origins
- **File uploads:** Validate file type, size limit (5MB for receipts)

**Rate limiting example:**

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many login attempts, please try again later',
});

app.use('/api/v1/auth/login', authLimiter);
```

---

## UI/UX Guidelines

### Design System

- **Colors:** Professional palette (teal primary, dark blue secondary, accent colors for categories)
- **Typography:** Sans-serif (Inter, SF Pro, or Circular)
- **Spacing:** 8px base unit (16px, 24px, 32px)
- **Border radius:** 8-12px for consistency
- **Shadows:** Subtle elevation (1-2 levels)

### Component Patterns

**Toast Notifications** (all user feedback):

```typescript
// Success
toast.success('Expense added successfully');

// Error
toast.error('Failed to delete category');

// Warning
toast.warning('This action cannot be undone');
```

**Skeleton Loaders** (loading states):

```tsx
{
  isLoading ? (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  ) : (
    <ExpenseCard expense={expense} />
  );
}
```

**Optimistic Updates** (critical actions only):

- Create/edit/delete transactions
- Update savings goal progress
- Toggle recurring transaction active status

### Accessibility

- **WCAG AA compliance:** Minimum contrast ratio 4.5:1
- **Keyboard navigation:** Tab order, focus indicators
- **Screen readers:** Semantic HTML, ARIA labels
- **Touch targets:** Minimum 44x44px for mobile

---

## Git Workflow

### Branching Strategy

- **main:** Production-ready code
- **develop:** Integration branch for features
- **feature/xxx:** Individual features
- **fix/xxx:** Bug fixes

### Commit Conventions

Use **Conventional Commits** format:

```
feat: add multi-currency support to transaction creation
fix: resolve incorrect total calculation in monthly report
refactor: simplify auto-categorization logic
docs: update API endpoint documentation
test: add integration tests for recurring transactions
```

**Structure:** `<type>: <concise description>`

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Tests
- `chore` - Tooling, dependencies

### Code Review

- All PRs require passing CI (lint, tests)
- PR description should explain "why" not "what"
- Keep PRs small (max 500 lines of changes)

---

## Deployment

### CI/CD Pipeline (GitHub Actions)

**On push to any branch:**

1. Lint + Format check (ESLint, Prettier)
2. Unit tests (Vitest/Jest)

**On PR to main:**

1. Integration tests (Supertest + test DB)
2. E2E tests (Playwright)
3. Deploy preview to Vercel

**On merge to main:**

1. Run all tests
2. Build frontend and backend
3. Run Prisma migrations
4. Deploy to production (Vercel + Railway)

### Environments

- **Development:** Local Docker Compose (PostgreSQL + Redis)
- **Staging:** Railway staging env with seed data
- **Production:** Railway production with daily backups

### Rollback

- **Frontend:** Vercel instant rollback to previous deploy
- **Backend:** Railway rollback + manual migration rollback if needed
- **Rule:** Never deploy on Fridays

---

## Working with Claude

### Explanation Philosophy

- **Always explain technical decisions:** "I chose Zustand over Redux because..."
- **Propose improvements proactively:** "This works, but we could optimize by..."
- **Suggest alternatives when relevant:** "We could also use X, but Y is better because..."

### Refactoring Freedom

- **You can refactor code freely** without asking permission
- **Always explain WHY you're refactoring:**
  - "Extracted this into a hook for reusability across components"
  - "Simplified this by removing unnecessary state updates"
  - "Split this 100-line function into smaller, testable units"

### When to Ask

- **Breaking changes:** Major architectural shifts
- **New dependencies:** Adding libraries not in the stack
- **Data model changes:** Altering database schema
- **Security decisions:** Authentication/authorization changes

### Code Examples

When showing code, always:

1. **Show before/after** when refactoring
2. **Add comments** explaining complex logic
3. **Include type definitions** for TypeScript
4. **Provide context** on where the code fits in the app

**Example response format:**

```typescript
// Before: 50-line function doing too much
function createExpense(data) {
  // ... complex logic
}

// After: Extracted into smaller, atomic functions
function validateExpenseData(data: CreateExpenseDTO): void {
  // Validation logic only
}

function categorizeExpense(description: string, categories: Category[]): string {
  // Categorization logic only
}

async function saveExpense(userId: string, data: ValidatedExpense): Promise<Transaction> {
  // Database save only
}

// Main function now orchestrates
async function createExpense(userId: string, data: CreateExpenseDTO): Promise<Transaction> {
  validateExpenseData(data);
  const categoryId = categorizeExpense(data.description, categories);
  return saveExpense(userId, { ...data, categoryId });
}
```

---

## Quick Reference Checklist

### Before Writing Code

- [ ] Understand the feature requirements
- [ ] Check if similar code exists (DRY)
- [ ] Plan atomic functions (one responsibility each)
- [ ] Consider error handling
- [ ] Think about mobile-first UX

### During Implementation

- [ ] Use TypeScript strict mode
- [ ] Add Zod validation in controllers
- [ ] Sanitize inputs on frontend
- [ ] Use descriptive short names
- [ ] Keep functions under 50 lines
- [ ] Add comments for complex logic (in English)

### After Implementation

- [ ] Write tests for critical functions
- [ ] Check responsive design (mobile-first)
- [ ] Add toast notifications for user feedback
- [ ] Implement skeleton loaders for loading states
- [ ] Use optimistic updates for critical actions
- [ ] Write concise, clear commit message
- [ ] Update documentation if needed

### Before PR

- [ ] Lint and format pass
- [ ] All tests pass
- [ ] No console.logs or debugger statements
- [ ] No commented-out code
- [ ] Environment variables in .env.example

---

## Common Patterns & Anti-Patterns

### ✅ DO THIS

**Atomic functions:**

```typescript
// Each function has one job
function validateAmount(amount: number): void {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (amount > 999999999) throw new Error('Amount too large');
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
```

**Error handling with user-friendly messages:**

```typescript
try {
  await createExpense(data);
  toast.success('Expense added successfully');
} catch (error) {
  if (error instanceof ValidationError) {
    toast.error('Please check your input and try again');
  } else {
    toast.error('Failed to add expense. Please try again later');
  }
}
```

**Optimistic updates:**

```typescript
const { mutate } = useMutation({
  mutationFn: deleteExpense,
  onMutate: async (id) => {
    await queryClient.cancelQueries(['transactions']);
    const previous = queryClient.getQueryData(['transactions']);

    queryClient.setQueryData(['transactions'], (old) => old.filter((t) => t.id !== id));

    return { previous };
  },
  onError: (err, id, context) => {
    queryClient.setQueryData(['transactions'], context.previous);
    toast.error('Failed to delete expense');
  },
});
```

### ❌ DON'T DO THIS

**Long, multi-responsibility functions:**

```typescript
// BAD - does too much
async function createExpenseAndUpdateDashboardAndNotifyUser(data: any) {
  const expense = await prisma.transaction.create({ data });
  const stats = await calculateStats(data.userId);
  await updateCache(data.userId, stats);
  await sendNotification(data.userId, 'Expense created');
  await logActivity(data.userId, 'CREATE_EXPENSE');
  return expense;
}
```

**Generic error messages:**

```typescript
// BAD - not helpful
catch (error) {
  toast.error('Error');
}

// GOOD - specific
catch (error) {
  toast.error('Failed to upload receipt. File must be under 5MB.');
}
```

**Using `any` type:**

```typescript
// BAD
function processData(data: any) {
  return data.amount * data.rate;
}

// GOOD
interface ConversionData {
  amount: number;
  rate: number;
}

function processData(data: ConversionData): number {
  return data.amount * data.rate;
}
```

---

## MVP Feature Priority

### Phase 1 (Weeks 1-4) - Core Functionality

- [x] User authentication (register, login, logout, JWT)
- [x] Transaction CRUD (create, read, update, delete)
- [x] Basic categories (pre-defined + custom)
- [x] Simple dashboard (total expenses, recent transactions)
- [x] Dark mode support
- [x] Multi-currency support

### Phase 2 (Weeks 5-8) - Enhanced Features

- [x] Automatic categorization
- [x] Recurring transactions
- [x] Savings goals with visual progress
- [x] Receipt photo uploads
- [x] Weekly/monthly reports with charts

### Phase 3 (Weeks 9-12) - Polish & PWA

- [x] Advanced reports (comparisons, custom periods)
- [x] Export reports (CSV/PDF)
- [x] PWA with offline support
- [x] Performance optimizations
- [x] Comprehensive testing

### Post-MVP (Future)

- [ ] OCR for receipt text extraction
- [ ] Push notifications
- [ ] Budget limits per category
- [ ] Bank integration (Open Banking)
- [ ] Native mobile apps (React Native)

---

## Final Notes

**Remember:**

- **Mobile-first always:** Design for small screens, enhance for desktop
- **Performance matters:** Financial apps need to feel fast and responsive
- **Security is non-negotiable:** User financial data must be protected
- **Simple is better:** Don't over-engineer, start with the simplest solution that works
- **User feedback is key:** Toast notifications keep users informed

**When in doubt:**

- Prioritize user experience over code elegance
- Choose boring, proven technology over shiny new tools
- Write code for readability, not cleverness
- Ask questions if requirements are unclear

**The guiding principle:**

> Build the simple correct thing today, with architecture that allows building the complex thing tomorrow.

---

**Last updated:** February 2026
**Version:** 1.0
