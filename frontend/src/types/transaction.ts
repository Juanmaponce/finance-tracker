export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'EXPENSE' | 'INCOME';
  isDefault: boolean;
  keywords: string[];
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER_TO_SAVINGS';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description: string | null;
  date: string;
  receiptUrl: string | null;
  isRecurring: boolean;
  createdAt: string;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface CreateTransactionData {
  amount: number;
  currency: string;
  categoryId?: string;
  type: TransactionType;
  description?: string;
  date: string;
}

export interface UpdateTransactionData {
  amount?: number;
  currency?: string;
  categoryId?: string;
  type?: TransactionType;
  description?: string;
  date?: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
}

export interface DashboardStats {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  savingsDeducted: number;
  totalSaved: number;
  expensesByCategory: CategoryStats[];
  recentTransactions: Transaction[];
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCategoryData {
  name: string;
  icon: string;
  color: string;
  type: 'EXPENSE' | 'INCOME';
  keywords?: string[];
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
  keywords?: string[];
}

// Recurring transactions
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  categoryId: string;
  description: string | null;
  frequency: Frequency;
  nextExecution: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringData {
  amount: number;
  currency: string;
  categoryId: string;
  description?: string;
  frequency: Frequency;
  nextExecution: string;
}

export interface UpdateRecurringData {
  amount?: number;
  currency?: string;
  categoryId?: string;
  description?: string;
  frequency?: Frequency;
  nextExecution?: string;
}

// Savings goals
export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  currency: string;
  deadline: string | null;
  deductFromBalance: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsData {
  name: string;
  targetAmount: number;
  currency: string;
  deadline?: string;
  deductFromBalance?: boolean;
}

export interface UpdateSavingsData {
  name?: string;
  targetAmount?: number;
  deadline?: string | null;
  deductFromBalance?: boolean;
}

export interface SavingsDeposit {
  id: string;
  amount: number;
  currency: string;
  note: string | null;
  date: string;
  createdAt: string;
}

// Reports
export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyTrend {
  date: string;
  expenses: number;
  income: number;
}

export interface ReportSummary {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  transactionCount: number;
  avgExpense: number;
  avgIncome: number;
  byCategory: CategoryBreakdown[];
  dailyTrend: DailyTrend[];
  currency: string;
  startDate: string;
  endDate: string;
}

export interface PeriodComparison {
  period1: ReportSummary;
  period2: ReportSummary;
  changes: {
    expenses: number;
    income: number;
    balance: number;
    transactionCount: number;
  };
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  type?: 'EXPENSE' | 'INCOME';
  categoryId?: string;
}
