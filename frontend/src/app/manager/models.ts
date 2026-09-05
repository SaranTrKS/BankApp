export interface CustomerLoanApplicationSummary {
  id: number;
  loan_type: string;
  amount: number;
  tenure_months: number;
  purpose: string | null;
  created_at: string;
}

export interface CustomerDepositApplicationSummary {
  id: number;
  scheme_name: string;
  customer_type: string;
  amount: number;
  tenure_days: number;
  projected_value: number;
  created_at: string;
}

export interface CustomerSummary {
  id: number;
  username: string;
  full_name: string | null;
  age: number | null;
  mobile: string | null;
  email: string | null;
  loan_applications: CustomerLoanApplicationSummary[];
  deposit_applications: CustomerDepositApplicationSummary[];
}
