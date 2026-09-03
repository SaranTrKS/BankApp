export type CustomerType = 'normal' | 'senior' | 'superSenior';

export type CalcType = 'FD_LADDER' | 'FD_FIXED' | 'DOUBLING' | 'RD' | 'FLAT';

export interface RateSet {
  normal: number;
  senior: number | null;
  superSenior: number | null;
}

export interface RateSlab {
  minDays: number;
  maxDays: number;
  label: string;
  rates: RateSet;
}

export interface DepositScheme {
  id: string;
  name: string;
  calcType: CalcType;
  supportsCustomerType: boolean;

  // FD_LADDER
  slabs?: RateSlab[];
  minTenureDays?: number;
  maxTenureDays?: number;

  // FD_FIXED / DOUBLING / RD
  fixedTenureDays?: number;
  rates?: RateSet;

  // amount / installment slider range
  minAmount: number;
  maxAmount: number;
  defaultAmount: number;
  amountStep: number;
  amountLabel: string;
}

export interface GrowthPoint {
  days: number;
  value: number;
}
