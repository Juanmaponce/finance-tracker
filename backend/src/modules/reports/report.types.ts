export interface ReportFilters {
  userId: string;
  startDate: string;
  endDate: string;
  type?: 'EXPENSE' | 'INCOME';
  categoryId?: string;
  accountId?: string;
}

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
    expenses: number; // percentage change
    income: number;
    balance: number;
    transactionCount: number;
  };
}
