export interface LoanTypeOption {
  id: string;
  label: string;
}

// Category list derived from DCC Bank Vizianagaram's own site plus sibling AP DCCBs
// (Srikakulam, Visakhapatnam) — see docs/loan-applications.md for sources. Vizianagaram's
// site does not publish rates/amounts for these, so this app only collects applications;
// it does not quote a rate.
export const LOAN_TYPES: LoanTypeOption[] = [
  { id: 'agriculture', label: 'Agricultural Loan' },
  { id: 'gold', label: 'Gold Loan' },
  { id: 'personal', label: 'Personal Loan' },
  { id: 'home', label: 'Home Loan' },
  { id: 'vehicle', label: 'Vehicle Loan' },
  { id: 'education', label: 'Education Loan' },
  { id: 'business', label: 'MSME / Business Loan' },
  { id: 'shg', label: 'Self Help Group (SHG) Loan' },
];

export interface LoanApplicationPayload {
  full_name: string;
  mobile: string;
  email?: string | null;
  loan_type: string;
  amount: number;
  tenure_months: number;
  purpose?: string | null;
  address?: string | null;
}

export interface LoanApplicationResponse extends LoanApplicationPayload {
  id: number;
  created_at: string;
}
