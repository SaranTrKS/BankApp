import { CustomerType, GrowthPoint, RateSet, RateSlab } from './models';

const DAYS_PER_YEAR = 365;

export function rateFor(rates: RateSet, customerType: CustomerType): number {
  const value =
    customerType === 'senior' ? rates.senior : customerType === 'superSenior' ? rates.superSenior : rates.normal;
  return value ?? rates.normal;
}

export function slabForDays(slabs: RateSlab[], days: number): RateSlab {
  return slabs.find((s) => days >= s.minDays && days <= s.maxDays) ?? slabs[slabs.length - 1];
}

/** Lump-sum FD maturity value with quarterly compounding. ratePercent is annual, e.g. 8.1 for 8.1%. */
export function fdMaturity(principal: number, ratePercent: number, days: number): number {
  const years = days / DAYS_PER_YEAR;
  const r = ratePercent / 100;
  return principal * Math.pow(1 + r / 4, 4 * years);
}

/**
 * Recurring deposit maturity value for `months` monthly installments at ratePercent annual,
 * quarterly compounding — the standard Indian-bank RD formula. Validated against DCCB-VZM's own
 * "Bala Bhavishyath Nidhi" illustration table (₹1,000/month for 84 months at 7.31% → ₹1,09,746
 * printed vs ₹1,09,791 computed, ~0.04% off, within the poster's rounding) — see
 * docs/deposit-schemes.md. Replaced an earlier monthly-compounding approximation that was ~0.2% off.
 */
export function rdMaturity(monthlyInstallment: number, ratePercent: number, months: number): number {
  const i = ratePercent / 100 / 4;
  if (i === 0) return monthlyInstallment * months;
  const quarters = months / 3;
  return (monthlyInstallment * (Math.pow(1 + i, quarters) - 1)) / (1 - Math.pow(1 + i, -1 / 3));
}

export function buildFdGrowthSeries(principal: number, ratePercent: number, totalDays: number, steps = 24): GrowthPoint[] {
  const points: GrowthPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const days = Math.round((totalDays * i) / steps);
    points.push({ days, value: fdMaturity(principal, ratePercent, days) });
  }
  return points;
}

export function buildFdLadderGrowthSeries(
  principal: number,
  slabs: RateSlab[],
  customerType: CustomerType,
  totalDays: number,
  steps = 24
): GrowthPoint[] {
  const points: GrowthPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const days = Math.max(1, Math.round((totalDays * i) / steps));
    const slab = slabForDays(slabs, days);
    const rate = rateFor(slab.rates, customerType);
    points.push({ days, value: fdMaturity(principal, rate, days) });
  }
  return points;
}

export function buildRdGrowthSeries(monthlyInstallment: number, ratePercent: number, totalMonths: number): GrowthPoint[] {
  const points: GrowthPoint[] = [];
  for (let m = 0; m <= totalMonths; m++) {
    points.push({ days: Math.round((m * DAYS_PER_YEAR) / 12), value: m === 0 ? 0 : rdMaturity(monthlyInstallment, ratePercent, m) });
  }
  return points;
}

export function buildFlatGrowthSeries(principal: number, ratePercent: number, totalDays: number, steps = 24): GrowthPoint[] {
  const points: GrowthPoint[] = [];
  const r = ratePercent / 100;
  for (let i = 0; i <= steps; i++) {
    const days = Math.round((totalDays * i) / steps);
    points.push({ days, value: principal * (1 + r * (days / DAYS_PER_YEAR)) });
  }
  return points;
}

export interface StageBreakdown {
  label: string;
  investment: number;
  maturity: number;
}

const BALA_BHAVISHYATH_RATE = 7.31;
const RD_STAGE_MONTHS = 84; // 7 years
const CTD_STAGE_DAYS = 7 * DAYS_PER_YEAR;

/**
 * Bala Bhavishyath Nidhi (children's scheme): 7yr RD, then the matured lump sum rolls into a
 * 7yr CTD (cumulative/compound term deposit), then auto-renews for another 7yr CTD — maturity
 * at year 21. Same 7.31% rate throughout, no new deposits after year 7. See docs/deposit-schemes.md.
 */
export function buildBalaBhavishyathStages(monthlyDeposit: number): StageBreakdown[] {
  const invested = monthlyDeposit * RD_STAGE_MONTHS;
  const maturity1 = rdMaturity(monthlyDeposit, BALA_BHAVISHYATH_RATE, RD_STAGE_MONTHS);
  const maturity2 = fdMaturity(maturity1, BALA_BHAVISHYATH_RATE, CTD_STAGE_DAYS);
  const maturity3 = fdMaturity(maturity2, BALA_BHAVISHYATH_RATE, CTD_STAGE_DAYS);
  return [
    { label: 'Years 1–7 (RD)', investment: invested, maturity: maturity1 },
    { label: 'Years 8–14 (CTD)', investment: maturity1, maturity: maturity2 },
    { label: 'Years 15–21 (Auto-renewal)', investment: maturity2, maturity: maturity3 },
  ];
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function formatTenure(days: number): string {
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  const years = days / 365;
  const wholeYears = Math.floor(years);
  const remMonths = Math.round((years - wholeYears) * 12);
  if (remMonths === 0) return `${wholeYears} year${wholeYears > 1 ? 's' : ''}`;
  return `${wholeYears}y ${remMonths}m`;
}
