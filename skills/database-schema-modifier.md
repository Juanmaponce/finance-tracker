---
name: database-schema-modifier
description: "Use this skill when modifying the Prisma database schema. Triggers: user asks to add/modify database tables, fields, relations, or mentions 'schema', 'migration', 'Prisma', 'database', 'model'. Ensures safe migrations, proper data types for financial data, indexes, constraints, and rollback safety."
---

# Database Schema Modifier Skill

## When to Use This Skill

**ALWAYS use this skill when:**

- Adding or modifying Prisma models
- Creating database migrations
- Changing field types, constraints, or indexes
- Adding or removing relationships
- User mentions: "database", "schema", "model", "migration", "Prisma", "table", "column"

---

## Critical Rules for Financial Data

### Data Types

✅ **MUST USE for money:**

```prisma
amount Decimal @db.Decimal(15, 2)  // NOT Float, NOT Int
```

✅ **MUST USE for dates:**

```prisma
date      DateTime @db.Timestamptz  // Timezone-aware
createdAt DateTime @default(now()) @db.Timestamptz
updatedAt DateTime @updatedAt @db.Timestamptz
```

✅ **MUST USE for IDs:**

```prisma
id String @id @default(uuid()) @db.Uuid
```

✅ **MUST USE for currencies:**

```prisma
currency String @db.Char(3)  // ISO 4217: USD, EUR, etc.
```

❌ **NEVER USE:**

- `Float` or `Double` for money (precision loss)
- `Int` for IDs (use UUID for distributed systems)
- `DateTime` without `@db.Timestamptz` (timezone issues)
- `String` for booleans (use `Boolean`)

---

## Prisma Schema Template

### Basic Model Structure

```prisma
model Transaction {
  // Primary key - always UUID
  id String @id @default(uuid()) @db.Uuid

  // Foreign keys - always reference by ID
  userId     String   @db.Uuid
  categoryId String   @db.Uuid

  // Relations
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  // Financial fields - always Decimal
  amount   Decimal @db.Decimal(15, 2)  // Max: 9,999,999,999,999.99
  currency String  @db.Char(3)

  // Enums
  type TransactionType @default(EXPENSE)

  // Text fields
  description String? @db.Text  // Nullable, unlimited length

  // Dates - always Timestamptz
  date      DateTime  @db.Timestamptz
  createdAt DateTime  @default(now()) @db.Timestamptz
  updatedAt DateTime  @updatedAt @db.Timestamptz
  deletedAt DateTime? @db.Timestamptz  // Soft delete

  // Indexes for query performance
  @@index([userId, date])           // Most common query pattern
  @@index([categoryId])
  @@index([deletedAt])              // For soft delete queries

  @@map("transactions")  // Explicit table name (plural, snake_case)
}

enum TransactionType {
  EXPENSE
  INCOME

  @@map("transaction_type")
}
```

---

## Field Types Reference

### Strings

```prisma
// Short strings (emails, names, codes)
email       String  @unique @db.VarChar(255)
displayName String  @db.VarChar(100)
currency    String  @db.Char(3)

// Long text (descriptions, notes)
description String? @db.Text

// Fixed-length strings
code String @db.Char(6)  // e.g., verification codes
```

### Numbers

```prisma
// Money - ALWAYS Decimal
amount Decimal @db.Decimal(15, 2)

// Percentages
interestRate Decimal @db.Decimal(5, 2)  // e.g., 12.50%

// Whole numbers
count Int @default(0)

// Large numbers
bigNumber BigInt
```

### Dates & Times

```prisma
// With timezone (ALWAYS use for user data)
date      DateTime @db.Timestamptz

// Auto-managed timestamps
createdAt DateTime @default(now()) @db.Timestamptz
updatedAt DateTime @updatedAt @db.Timestamptz

// Soft delete
deletedAt DateTime? @db.Timestamptz
```

### Booleans

```prisma
isActive  Boolean @default(true)
darkMode  Boolean @default(false)
isDefault Boolean @default(false)
```

### Arrays

```prisma
// PostgreSQL array types
keywords String[] @db.Text

// JSON for complex data
metadata Json?
```

### Enums

```prisma
enum Currency {
  USD
  EUR
  GBP
  ARS

  @@map("currency")
}

// Usage
primaryCurrency Currency @default(USD)
```

---

## Relationships

### One-to-Many

```prisma
model User {
  id           String        @id @default(uuid()) @db.Uuid
  transactions Transaction[]  // One user has many transactions

  @@map("users")
}

model Transaction {
  id     String @id @default(uuid()) @db.Uuid
  userId String @db.Uuid

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("transactions")
}
```

### Many-to-Many (Explicit Join Table)

```prisma
model User {
  id          String        @id @default(uuid()) @db.Uuid
  userRoles   UserRole[]

  @@map("users")
}

model Role {
  id        String     @id @default(uuid()) @db.Uuid
  name      String     @unique
  userRoles UserRole[]

  @@map("roles")
}

model UserRole {
  userId String @db.Uuid
  roleId String @db.Uuid

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])  // Composite primary key
  @@map("user_roles")
}
```

### Cascade Behavior

```prisma
// Delete user → delete all their transactions
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

// Delete category → prevent if transactions exist
category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

// Delete category → set categoryId to null
category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
```

---

## Indexes for Performance

### Single Column Indexes

```prisma
model Transaction {
  id     String   @id @default(uuid())
  userId String   @db.Uuid
  email  String   @unique  // Automatic index
  date   DateTime @db.Timestamptz

  // Explicit index on foreign key
  @@index([userId])

  // Index for date range queries
  @@index([date])

  @@map("transactions")
}
```

### Composite Indexes

```prisma
model Transaction {
  id         String   @id @default(uuid())
  userId     String   @db.Uuid
  categoryId String   @db.Uuid
  date       DateTime @db.Timestamptz

  // Most queries filter by userId AND date
  @@index([userId, date])

  // For category-specific queries
  @@index([userId, categoryId])

  @@map("transactions")
}
```

### Unique Constraints

```prisma
model Category {
  id     String @id @default(uuid())
  userId String @db.Uuid
  name   String

  // User cannot have duplicate category names
  @@unique([userId, name])

  @@map("categories")
}
```

---

## Soft Deletes Pattern

**ALWAYS use soft deletes for financial data** - never hard delete.

```prisma
model Transaction {
  id        String    @id @default(uuid())
  amount    Decimal   @db.Decimal(15, 2)
  deletedAt DateTime? @db.Timestamptz

  // Index for filtering out deleted records
  @@index([deletedAt])

  @@map("transactions")
}
```

**Query pattern:**

```typescript
// Exclude deleted records
await prisma.transaction.findMany({
  where: {
    userId,
    deletedAt: null, // Only active records
  },
});

// Soft delete
await prisma.transaction.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Restore
await prisma.transaction.update({
  where: { id },
  data: { deletedAt: null },
});
```

---

## Default Values

```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  primaryCurrency String   @default("USD") @db.Char(3)
  darkMode        Boolean  @default(false)
  locale          String   @default("es") @db.VarChar(10)
  createdAt       DateTime @default(now()) @db.Timestamptz

  @@map("users")
}

model Transaction {
  id     String          @id @default(uuid())
  type   TransactionType @default(EXPENSE)
  amount Decimal         @db.Decimal(15, 2)

  @@map("transactions")
}
```

---

## Migration Safety Rules

### Two-Phase Destructive Changes

**NEVER drop columns immediately in production.**

#### Phase 1: Deprecate

```prisma
model User {
  id       String  @id @default(uuid())
  oldField String? @db.VarChar(100)  // Make nullable
  newField String  @db.VarChar(100)  // Add replacement

  @@map("users")
}
```

1. Deploy code that uses `newField` instead of `oldField`
2. Migrate data from `oldField` to `newField`
3. Wait 1 week to ensure no issues

#### Phase 2: Remove

```prisma
model User {
  id       String @id @default(uuid())
  newField String @db.VarChar(100)
  // oldField removed

  @@map("users")
}
```

### Safe Changes (No Data Loss)

✅ **SAFE:**

- Adding nullable fields
- Adding new models
- Adding indexes
- Adding non-null fields WITH default values
- Making required fields nullable

```prisma
// Safe: Adding nullable field
description String? @db.Text

// Safe: Adding with default
isActive Boolean @default(true)
```

### Dangerous Changes (Require Care)

⚠️ **DANGEROUS:**

- Dropping columns
- Changing column types
- Making nullable fields required
- Removing defaults
- Changing unique constraints

```prisma
// DANGEROUS: Data loss if deployed directly
// amount Float → Decimal requires migration script

// Step 1: Add new column
amountNew Decimal? @db.Decimal(15, 2)

// Step 2: Migrate data (custom SQL)
UPDATE transactions SET amount_new = CAST(amount AS DECIMAL(15,2));

// Step 3: Make new column required, drop old
// (in separate migration)
```

---

## Migration Commands

### Create Migration

```bash
# Generate migration from schema changes
npx prisma migrate dev --name add_recurring_transactions

# Preview migration SQL without applying
npx prisma migrate dev --create-only

# Apply pending migrations
npx prisma migrate deploy
```

### Rollback Strategy

```bash
# Mark migration as rolled back (doesn't undo changes)
npx prisma migrate resolve --rolled-back "20240207_add_field"

# Manual rollback requires custom SQL
```

**Always create rollback scripts for production migrations:**

```sql
-- migrations/20240207_add_receipts/down.sql
ALTER TABLE transactions DROP COLUMN receipt_url;
DROP TABLE receipts;
```

---

## Complete Example Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String   @id @default(uuid()) @db.Uuid
  email           String   @unique @db.VarChar(255)
  passwordHash    String   @db.VarChar(255)
  displayName     String   @db.VarChar(100)
  primaryCurrency String   @default("USD") @db.Char(3)
  darkMode        Boolean  @default(false)
  locale          String   @default("es") @db.VarChar(10)
  createdAt       DateTime @default(now()) @db.Timestamptz
  updatedAt       DateTime @updatedAt @db.Timestamptz

  // Relations
  transactions         Transaction[]
  categories          Category[]
  savingsGoals        SavingsGoal[]
  recurringTransactions RecurringTransaction[]

  @@index([email])
  @@map("users")
}

model Category {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @db.Uuid
  name       String    @db.VarChar(50)
  icon       String    @db.VarChar(50)
  color      String    @db.Char(7)  // Hex color: #FF5733
  type       CategoryType
  isDefault  Boolean   @default(false)
  keywords   String[]  @db.Text
  createdAt  DateTime  @default(now()) @db.Timestamptz

  // Relations
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  // User cannot have duplicate category names
  @@unique([userId, name])
  @@index([userId])
  @@map("categories")
}

model Transaction {
  id          String       @id @default(uuid()) @db.Uuid
  userId      String       @db.Uuid
  amount      Decimal      @db.Decimal(15, 2)
  currency    String       @db.Char(3)
  categoryId  String       @db.Uuid
  type        TransactionType @default(EXPENSE)
  description String?      @db.Text
  date        DateTime     @db.Timestamptz
  receiptUrl  String?      @db.Text
  isRecurring Boolean      @default(false)
  recurringId String?      @db.Uuid
  createdAt   DateTime     @default(now()) @db.Timestamptz
  updatedAt   DateTime     @updatedAt @db.Timestamptz
  deletedAt   DateTime?    @db.Timestamptz

  // Relations
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category  Category  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  recurring RecurringTransaction? @relation(fields: [recurringId], references: [id])

  // Indexes for common query patterns
  @@index([userId, date])
  @@index([categoryId])
  @@index([deletedAt])
  @@index([userId, type])
  @@map("transactions")
}

model RecurringTransaction {
  id             String          @id @default(uuid()) @db.Uuid
  userId         String          @db.Uuid
  amount         Decimal         @db.Decimal(15, 2)
  currency       String          @db.Char(3)
  categoryId     String          @db.Uuid
  description    String?         @db.Text
  frequency      Frequency
  nextExecution  DateTime        @db.Timestamptz
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now()) @db.Timestamptz
  updatedAt      DateTime        @updatedAt @db.Timestamptz

  // Relations
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@index([userId, nextExecution])
  @@index([isActive])
  @@map("recurring_transactions")
}

model SavingsGoal {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @db.Uuid
  name         String    @db.VarChar(100)
  targetAmount Decimal   @db.Decimal(15, 2)
  currentAmount Decimal  @default(0) @db.Decimal(15, 2)
  currency     String    @db.Char(3)
  deadline     DateTime? @db.Timestamptz
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @updatedAt @db.Timestamptz

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("savings_goals")
}

enum TransactionType {
  EXPENSE
  INCOME

  @@map("transaction_type")
}

enum CategoryType {
  EXPENSE
  INCOME

  @@map("category_type")
}

enum Frequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY

  @@map("frequency")
}
```

---

## Checklist Before Migration

- [ ] UUID for all primary keys (`@db.Uuid`)
- [ ] Decimal for all money fields (`@db.Decimal(15, 2)`)
- [ ] Timestamptz for all dates (`@db.Timestamptz`)
- [ ] Char(3) for currencies (`@db.Char(3)`)
- [ ] Soft delete with `deletedAt` field
- [ ] Indexes on foreign keys
- [ ] Composite indexes for common query patterns
- [ ] Appropriate cascade behavior (`Cascade`, `Restrict`, `SetNull`)
- [ ] Default values where appropriate
- [ ] Unique constraints where needed
- [ ] Two-phase strategy for destructive changes
- [ ] Rollback script created (production only)
- [ ] Migration tested on staging first

---

## Common Mistakes to Avoid

❌ **Float for money**

```prisma
amount Float  // NEVER - precision loss
amount Decimal @db.Decimal(15, 2)  // ALWAYS
```

❌ **DateTime without timezone**

```prisma
date DateTime  // BAD
date DateTime @db.Timestamptz  // GOOD
```

❌ **Hard deletes for financial data**

```prisma
// BAD - data loss
await prisma.transaction.delete({ where: { id } });

// GOOD - soft delete
await prisma.transaction.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

❌ **Missing indexes on foreign keys**

```prisma
model Transaction {
  userId String @db.Uuid
  user   User   @relation(...)
  // Missing: @@index([userId])
}
```

❌ **Destructive changes without two-phase**

```prisma
// DANGEROUS - immediate column drop
// Should use two-phase approach
```
