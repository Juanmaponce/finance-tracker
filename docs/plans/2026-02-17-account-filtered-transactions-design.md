# Account-Filtered Recent Transactions

**Date:** 2026-02-17
**Status:** Approved

## Problem

The dashboard's recent transactions list shows all transactions across all accounts. When a user swipes to a specific account in the balance carousel, they expect the transaction list to reflect that account's transactions only.

## Solution

Filter the recent transactions list based on the selected carousel card, using a Zustand store for shared state and backend filtering for accurate results.

## Design Decisions

| Decision               | Choice              | Rationale                                                                           |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| State management       | Zustand store       | Shared state between sibling components (carousel + transaction list), decoupled    |
| Filtering              | Backend (API param) | Always returns 10 relevant transactions per account, not a subset of 10 global ones |
| "All accounts" view    | First carousel card | Preserves current behavior as an explicit option                                    |
| Savings goal selection | Show deposits only  | When a savings goal card is selected, show its TRANSFER_TO_SAVINGS transactions     |

## Data Flow

```
BalanceCarousel (scroll/tap)
    -> useSelectedAccountStore.setSelection({ type, id })

DashboardPage reads store
    -> if 'all' or 'account': useDashboardStats({ accountId? })
    -> if 'savings': useSavingsDeposits(goalId)

TransactionList receives filtered data
```

## Components

### 1. Zustand Store — `stores/selected-account-store.ts`

```typescript
type CarouselSelection =
  | { type: 'all' }
  | { type: 'account'; accountId: string }
  | { type: 'savings'; goalId: string };

interface SelectedAccountStore {
  selection: CarouselSelection;
  setSelection: (selection: CarouselSelection) => void;
}
```

Default selection: `{ type: 'all' }`.

### 2. Backend — `GET /transactions/dashboard`

- Add optional `?accountId=` query param
- When provided, scope all aggregations (monthly totals, category breakdown, recent transactions) to that account
- Update Redis cache key to include accountId: `dashboard:{userId}:{accountId || 'all'}`

### 3. Balance Carousel

- Insert an "All Accounts" card at index 0 showing combined balance in primary currency
- On scroll settle or dot tap, update Zustand store:
  - Index 0 = `{ type: 'all' }`
  - Index 1..N = `{ type: 'account', accountId }`
  - Index N+1.. = `{ type: 'savings', goalId }`

### 4. Transaction List

- Read selection from Zustand store
- When `'all'` or `'account'`: render recent transactions from `useDashboardStats`
- When `'savings'`: render deposit history for the selected savings goal

## API Changes

### Modified: `GET /api/v1/transactions/dashboard`

**New query param:** `accountId` (optional, UUID)

When provided:

- `monthlyExpenses` scoped to account
- `monthlyIncome` scoped to account
- `expensesByCategory` scoped to account
- `recentTransactions` scoped to account (10 most recent for that account)

When omitted: current behavior (all accounts).

## Cache Invalidation

Current cache key: `dashboard:{userId}`
New cache key pattern: `dashboard:{userId}:{accountId || 'all'}`

On transaction create/update/delete, invalidate all dashboard cache keys for the user:

- `dashboard:{userId}:*`
