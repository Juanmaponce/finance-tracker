export interface MonthlySummary {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  topCategory: {
    name: string;
    amount: number;
  };
  month: string;
  currency: string;
}
