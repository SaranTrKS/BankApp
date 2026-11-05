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
  branch_code: number | null;
  branch_name: string | null;
  loan_applications: CustomerLoanApplicationSummary[];
  deposit_applications: CustomerDepositApplicationSummary[];
}

export type CallbackStatus = 'new' | 'contacted';

/** A kiosk "please call me back" request. The mobile number is not verified. */
export interface CallbackRequestRow {
  id: number;
  full_name: string;
  mobile: string;
  interest_type: 'deposit' | 'loan' | 'general';
  interest_ref: string | null;
  interest_label: string | null;
  amount: number | null;
  branch_code: number;
  branch_name: string | null;
  source: string;
  status: CallbackStatus;
  created_at: string;
  contacted_at: string | null;
  contacted_by_username: string | null;
}
