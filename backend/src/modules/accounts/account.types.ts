export interface CreateAccountDTO {
  name: string;
  currency: string;
  icon?: string;
  color?: string;
}

export interface UpdateAccountDTO {
  name?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface AccountResponse {
  id: string;
  userId: string;
  name: string;
  currency: string;
  icon: string | null;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountBalance {
  accountId: string;
  account: AccountResponse;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSaved: number;
}
