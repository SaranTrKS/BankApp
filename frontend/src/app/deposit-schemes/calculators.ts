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

/** Recurring deposit maturity value for `months` monthly installments at ratePercent annual, monthly compounding. */
export function rdMaturity(monthlyInstallment: number, ratePercent: number, months: number): number {
  const i = ratePercent / 100 / 12;
  if (i === 0) return monthlyInstallment * months;
  return monthlyInstallment * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
}

/** Years needed for a lump sum to double at ratePercent annual, quarterly compounding. */
export function doublingTenureYears(ratePercent: number): number {
  const r = ratePercent / 100;
  return Math.log(2) / (4 * Math.log(1 + r / 4));
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
