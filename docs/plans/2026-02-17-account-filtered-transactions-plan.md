# Account-Filtered Recent Transactions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Filter the dashboard's recent transactions (and stats) by the account selected in the balance carousel, including an "All Accounts" summary card and savings goal deposit view.

**Architecture:** A Zustand store shares the carousel selection between BalanceCarousel and DashboardPage. The backend `GET /transactions/dashboard` accepts an optional `accountId` query param to scope all aggregations. When a savings goal is selected, the existing `useDeposits` hook provides deposit history.

**Tech Stack:** Zustand (store), TanStack Query (data fetching), Express + Zod (backend validation), Prisma (queries), Redis (cache)

**Design doc:** `docs/plans/2026-02-17-account-filtered-transactions-design.md`

---

## Task 1: Backend — Add accountId filter to dashboard stats

**Files:**

- Modify: `backend/src/modules/transactions/transaction.controller.ts:94-102`
- Modify: `backend/src/modules/transactions/transaction.service.ts:115-268`
- Modify: `backend/src/modules/transactions/transaction.repository.ts:89-100`
- Modify: `backend/src/modules/transactions/transaction.types.ts`

**Step 1: Add accountId to TransactionFilters type**

In `backend/src/modules/transactions/transaction.types.ts`, add `accountId` to `TransactionFilters`:

```typescript
export interface TransactionFilters {
  userId: string;
  page: number;
  limit: number;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}
```

**Step 2: Update repository to support accountId filter**

In `backend/src/modules/transactions/transaction.repository.ts`:

Update `buildWhere` (line 10) to include accountId:

```typescript
private buildWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
  return {
    userId: filters.userId,
    deletedAt: null,
    ...(filters.type && { type: filters.type }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.accountId && { accountId: filters.accountId }),
    ...((filters.startDate || filters.endDate) && {
      date: {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      },
    }),
  };
}
```

Update `getStats` (line 89) to accept optional accountId:

```typescript
async getStats(userId: string, startDate: Date, endDate: Date, accountId?: string) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
      ...(accountId && { accountId }),
    },
    include: { category: categorySelect },
  });

  return transactions;
}
```

**Step 3: Update service getDashboardStats to accept accountId**

In `backend/src/modules/transactions/transaction.service.ts`:

Change the method signature (line 115) and update cache key, stats query, and recent transactions query:

```typescript
async getDashboardStats(userId: string, accountId?: string): Promise<DashboardStats> {
  const cacheKey = `dashboard:${userId}:${accountId || 'all'}`;

  // ... existing cache check stays the same ...

  // Pass accountId to getStats
  const transactions = await transactionRepository.getStats(userId, startOfMonth, endOfMonth, accountId);

  // ... existing aggregation logic stays the same ...

  // Pass accountId to recent transactions query
  const recentFilters: TransactionFilters = { userId, page: 1, limit: 10, ...(accountId && { accountId }) };
  const recent = await transactionRepository.findMany(recentFilters);

  // ... rest stays the same ...
}
```

Update `invalidateCache` (line 262) to use wildcard pattern:

```typescript
private async invalidateCache(userId: string) {
  try {
    const keys = await redis.keys(`dashboard:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
  }
}
```

**Step 4: Update controller to parse accountId from query**

In `backend/src/modules/transactions/transaction.controller.ts` (line 94):

```typescript
export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const stats = await transactionService.getDashboardStats(req.user!.userId, accountId);

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
```

**Step 5: Run backend tests**

Run: `cd backend && npm test -- --testPathPattern=transaction`
Expected: All existing tests pass (no breaking changes)

**Step 6: Commit**

```bash
git add backend/src/modules/transactions/
git commit -m "feat: add accountId filter to dashboard stats endpoint"
```

---

## Task 2: Backend — Unit test for filtered dashboard stats

**Files:**

- Modify: `backend/src/modules/transactions/__tests__/transaction.service.test.ts`

**Step 1: Add test for getDashboardStats with accountId filter**

Add a new describe block to the existing test file:

```typescript
describe('getDashboardStats', () => {
  const userId = 'user-1';
  const accountId = 'acc-1';

  beforeEach(() => {
    jest.spyOn(redis, 'get').mockResolvedValue(null);
    jest.spyOn(redis, 'set').mockResolvedValue('OK');
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: userId,
      primaryCurrency: 'USD',
    } as any);
    jest.spyOn(prisma.savingsGoal, 'aggregate').mockResolvedValue({
      _sum: { currentAmount: 0 },
    } as any);
    (savingsService.getDeductedSavingsTotal as jest.Mock).mockResolvedValue(0);
  });

  it('should pass accountId to repository when provided', async () => {
    mockTransactionRepo.getStats.mockResolvedValue([]);
    mockTransactionRepo.findMany.mockResolvedValue([]);

    await transactionService.getDashboardStats(userId, accountId);

    expect(mockTransactionRepo.getStats).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
      expect.any(Date),
      accountId,
    );
    expect(mockTransactionRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ accountId }),
    );
  });

  it('should not pass accountId to repository when not provided', async () => {
    mockTransactionRepo.getStats.mockResolvedValue([]);
    mockTransactionRepo.findMany.mockResolvedValue([]);

    await transactionService.getDashboardStats(userId);

    expect(mockTransactionRepo.getStats).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
      expect.any(Date),
      undefined,
    );
  });

  it('should include accountId in cache key', async () => {
    mockTransactionRepo.getStats.mockResolvedValue([]);
    mockTransactionRepo.findMany.mockResolvedValue([]);

    await transactionService.getDashboardStats(userId, accountId);

    expect(redis.set).toHaveBeenCalledWith(
      `dashboard:${userId}:${accountId}`,
      expect.any(String),
      'EX',
      expect.any(Number),
    );
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `cd backend && npm test -- --testPathPattern=transaction.service`
Expected: All tests pass including the new ones

**Step 3: Commit**

```bash
git add backend/src/modules/transactions/__tests__/
git commit -m "test: add unit tests for account-filtered dashboard stats"
```

---

## Task 3: Frontend — Create Zustand store for carousel selection

**Files:**

- Create: `frontend/src/stores/carousel-selection.store.ts`

**Step 1: Create the store**

```typescript
import { create } from 'zustand';

export type CarouselSelection =
  | { type: 'all' }
  | { type: 'account'; accountId: string }
  | { type: 'savings'; goalId: string };

interface CarouselSelectionStore {
  selection: CarouselSelection;
  setSelection: (selection: CarouselSelection) => void;
}

export const useCarouselSelectionStore = create<CarouselSelectionStore>((set) => ({
  selection: { type: 'all' },
  setSelection: (selection) => set({ selection }),
}));
```

**Step 2: Commit**

```bash
git add frontend/src/stores/carousel-selection.store.ts
git commit -m "feat: add Zustand store for carousel account selection"
```

---

## Task 4: Frontend — Update useDashboardStats to accept accountId

**Files:**

- Modify: `frontend/src/services/transaction.service.ts:12-15`
- Modify: `frontend/src/hooks/use-transactions.ts:12-17`

**Step 1: Update the API service function to accept accountId**

In `frontend/src/services/transaction.service.ts`, update `getDashboardStats`:

```typescript
export async function getDashboardStats(accountId?: string): Promise<DashboardStats> {
  const params = accountId ? `?accountId=${accountId}` : '';
  const response = await api.get<ApiResponse<DashboardStats>>(`/transactions/dashboard${params}`);
  return response.data;
}
```

**Step 2: Update the hook to accept and pass accountId**

In `frontend/src/hooks/use-transactions.ts`, update `useDashboardStats`:

```typescript
export function useDashboardStats(accountId?: string) {
  return useQuery({
    queryKey: ['dashboard-stats', accountId ?? 'all'],
    queryFn: () => transactionService.getDashboardStats(accountId),
  });
}
```

**Step 3: Commit**

```bash
git add frontend/src/services/transaction.service.ts frontend/src/hooks/use-transactions.ts
git commit -m "feat: add accountId param to dashboard stats hook and service"
```

---

## Task 5: Frontend — Add "All Accounts" card and sync carousel with store

**Files:**

- Modify: `frontend/src/components/organisms/balance-carousel.tsx`
- Create: `frontend/src/components/molecules/all-accounts-card.tsx`

**Step 1: Create the AllAccountsCard component**

This card shows the combined balance across all accounts in the user's primary currency.

```typescript
import { Layers } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import type { AccountBalance } from '@/types/transaction';
import { useAuthStore } from '@/stores/auth.store';

interface AllAccountsCardProps {
  balances: AccountBalance[];
}

export function AllAccountsCard({ balances }: AllAccountsCardProps) {
  const { user } = useAuthStore();
  const currency = user?.primaryCurrency || 'USD';

  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
  const totalIncome = balances.reduce((sum, b) => sum + b.monthlyIncome, 0);
  const totalExpenses = balances.reduce((sum, b) => sum + b.monthlyExpenses, 0);

  return (
    <div className="h-full flex flex-col rounded-xl bg-card border border-border p-4 hover:shadow-md transition-shadow border-t-[3px] border-t-primary-500">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
          <Layers className="size-4 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-foreground truncate">Todas las cuentas</h3>
          <p className="text-xs text-muted-foreground">{currency}</p>
        </div>
      </div>

      <div className="mb-4 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">Balance total</p>
        <p className="text-2xl font-bold text-foreground">
          {formatCurrency(totalBalance, currency)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Ingresos del mes</p>
          <p className="text-xs font-semibold text-income">
            +{formatCurrency(totalIncome, currency)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Gastos del mes</p>
          <p className="text-xs font-semibold text-expense">
            -{formatCurrency(totalExpenses, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update BalanceCarousel to include "All Accounts" card and sync with store**

In `frontend/src/components/organisms/balance-carousel.tsx`:

Add imports:

```typescript
import { AllAccountsCard } from '@/components/molecules/all-accounts-card';
import { useCarouselSelectionStore } from '@/stores/carousel-selection.store';
```

Inside the component, add store interaction:

```typescript
const setSelection = useCarouselSelectionStore((s) => s.setSelection);
```

Update `totalCards` to account for the new "All" card:

```typescript
const totalCards = 1 + (balances?.length ?? 0) + activeSavings.length + 1; // all-card + accounts + savings + add-button
```

Add a `useEffect` that syncs `activeIndex` to the store whenever it changes:

```typescript
useEffect(() => {
  const accountCount = balances?.length ?? 0;

  if (activeIndex === 0) {
    setSelection({ type: 'all' });
  } else if (activeIndex <= accountCount) {
    const account = balances?.[activeIndex - 1];
    if (account) {
      setSelection({ type: 'account', accountId: account.accountId });
    }
  } else {
    const savingsIndex = activeIndex - accountCount - 1;
    const goal = activeSavings[savingsIndex];
    if (goal) {
      setSelection({ type: 'savings', goalId: goal.id });
    }
  }
}, [activeIndex, balances, activeSavings, setSelection]);
```

In the carousel scroll container, add the "All Accounts" card before account cards:

```tsx
{/* All accounts card */}
<div
  className="min-w-[75%] sm:min-w-[60%] md:min-w-[45%] flex-shrink-0"
  style={{ scrollSnapAlign: 'start' }}
>
  <AllAccountsCard balances={balances ?? []} />
</div>

{/* Account balance cards */}
{balances?.map((balance) => (
  // ... existing code ...
))}
```

**Step 3: Commit**

```bash
git add frontend/src/components/molecules/all-accounts-card.tsx frontend/src/components/organisms/balance-carousel.tsx
git commit -m "feat: add All Accounts card and sync carousel selection to store"
```

---

## Task 6: Frontend — Wire DashboardPage to read selection and filter data

**Files:**

- Modify: `frontend/src/components/pages/dashboard-page.tsx`

**Step 1: Update DashboardPage to use carousel selection**

Add imports:

```typescript
import { useCarouselSelectionStore } from '@/stores/carousel-selection.store';
import { useDeposits } from '@/hooks/use-savings';
```

Inside the component, read the selection and derive the accountId:

```typescript
const selection = useCarouselSelectionStore((s) => s.selection);
const accountId = selection.type === 'account' ? selection.accountId : undefined;

const { data: stats, isLoading } = useDashboardStats(accountId);
const { data: deposits, isLoading: loadingDeposits } = useDeposits(
  selection.type === 'savings' ? selection.goalId : '',
);
```

Note: `useDeposits` already accepts a goalId and is disabled when empty string is passed (the hook uses `enabled: !!goalId`).

Update the "Recent transactions" section to conditionally show deposits when a savings goal is selected:

```tsx
{
  /* Recent transactions */
}
<div>
  <h2 className="text-sm font-semibold text-foreground mb-3">
    {selection.type === 'savings' ? 'Depositos' : 'Transacciones recientes'}
  </h2>
  <div className="rounded-xl bg-card p-4 border border-border">
    {selection.type === 'savings' ? (
      <SavingsDepositList deposits={deposits ?? []} isLoading={loadingDeposits} />
    ) : (
      <TransactionList
        transactions={stats?.recentTransactions ?? []}
        isLoading={isLoading}
        onDelete={handleDelete}
        onAddFirst={() => setShowAddForm(true)}
        onTransactionClick={setSelectedTransaction}
      />
    )}
  </div>
</div>;
```

**Step 2: Create a simple SavingsDepositList component**

Create `frontend/src/components/molecules/savings-deposit-list.tsx`:

```typescript
import { PiggyBank } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/molecules/empty-state';
import { formatCurrency } from '@/utils/format';
import type { SavingsDeposit } from '@/types/transaction';

interface SavingsDepositListProps {
  deposits: SavingsDeposit[];
  isLoading: boolean;
}

export function SavingsDepositList({ deposits, isLoading }: SavingsDepositListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title="Sin depositos"
        description="Aun no hay depositos en esta meta de ahorro"
      />
    );
  }

  return (
    <div className="divide-y divide-border" role="list" aria-label="Depositos">
      {deposits.map((deposit) => (
        <div key={deposit.id} role="listitem" className="flex items-center gap-3 py-3">
          <div className="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <PiggyBank className="size-4 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {deposit.note || 'Deposito'}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(deposit.createdAt).toLocaleDateString()}
            </p>
          </div>
          <p className="text-sm font-semibold text-primary-500">
            +{formatCurrency(deposit.amount, deposit.currency || 'USD')}
          </p>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Also update the CategoryChart section to hide when savings is selected**

In the category chart section of dashboard-page.tsx:

```tsx
{
  /* Category chart */
}
{
  selection.type !== 'savings' && stats && stats.expensesByCategory.length > 0 && (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-foreground mb-3">Gastos por categoria</h2>
      <div className="rounded-xl bg-card p-4 border border-border">
        <CategoryChart data={stats.expensesByCategory} currency={currency} />
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/pages/dashboard-page.tsx frontend/src/components/molecules/savings-deposit-list.tsx
git commit -m "feat: wire dashboard to filter transactions by carousel selection"
```

---

## Task 7: Frontend — Update cache invalidation in mutation hooks

**Files:**

- Modify: `frontend/src/hooks/use-transactions.ts`

**Step 1: Update invalidation to clear all dashboard-stats variants**

The `queryKey` for dashboard stats now includes the accountId: `['dashboard-stats', accountId]`. When a transaction is created or deleted, we need to invalidate all variants.

TanStack Query's `invalidateQueries` with a partial key already handles this — `{ queryKey: ['dashboard-stats'] }` will match `['dashboard-stats', 'all']`, `['dashboard-stats', 'acc-123']`, etc. So this already works correctly.

Verify by checking the existing hooks: the `onSuccess`/`onSettled` handlers use `queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })` which is a prefix match. No changes needed.

**Step 2: Commit (skip if no changes needed)**

No code changes — the existing invalidation pattern already handles partial key matching.

---

## Task 8: Manual testing and verification

**Step 1: Start the dev servers**

Run: `cd backend && npm run dev` (in one terminal)
Run: `cd frontend && npm run dev` (in another terminal)

**Step 2: Test scenarios**

1. **All Accounts card visible**: Open dashboard — first card should be "Todas las cuentas" with combined balances
2. **Swipe to specific account**: Swipe right to an account card — transaction list should update to show only that account's transactions
3. **Swipe back to All**: Swipe back to first card — transaction list should show all transactions again
4. **Savings goal card**: Swipe to a savings goal — transaction list should switch to showing deposits for that goal
5. **Create transaction**: While on a specific account view, create a transaction — list should refresh with the new transaction
6. **Empty state**: Select an account with no transactions — should show "Sin transacciones" empty state

**Step 3: Run all tests**

Run: `cd backend && npm test`
Run: `cd frontend && npm test`
Expected: All tests pass

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: adjustments from manual testing"
```
