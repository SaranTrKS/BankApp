import { Component, computed, output, signal } from '@angular/core';
import {
  buildSchemeGrowthSeries,
  formatInr,
  formatTenure,
  rdInstallmentCount,
  schemeRate,
} from '../../deposit-schemes/calculators';
import { ChartLine } from '../../deposit-schemes/chart-line/chart-line';
import { DEPOSIT_SCHEMES } from '../../deposit-schemes/deposit-schemes.data';
import { CustomerType, DepositScheme } from '../../deposit-schemes/models';
import { CallbackInterest } from '../callback.service';
import { SCHEME_PHOTOS } from '../kiosk-photos';
import { KIOSK_TEXT } from '../kiosk-text';
import { NumberPad, applyPadKey } from '../number-pad/number-pad';

interface TenureChip {
  label: string;
  days: number;
}

const LADDER_TENURES: TenureChip[] = [
  { label: '3 months', days: 91 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
  { label: '2 years', days: 730 },
  { label: '3 years', days: 1095 },
  { label: '5 years', days: 1825 },
];

const CUSTOMER_TYPES: { id: CustomerType; label: string }[] = [
  { id: 'normal', label: 'Below 60' },
  { id: 'senior', label: 'Senior 60+' },
  { id: 'superSenior', label: 'Super Senior 80+' },
];

/** Deposit schemes on the kiosk: same data and formulas as the main site, touch-sized. */
@Component({
  selector: 'app-kiosk-deposits',
  standalone: true,
  imports: [ChartLine, NumberPad],
  templateUrl: './kiosk-deposits.html',
  styleUrl: './kiosk-deposits.scss',
})
export class KioskDeposits {
  callback = output<CallbackInterest>();

  readonly t = KIOSK_TEXT;
  readonly schemes = DEPOSIT_SCHEMES;
  readonly customerTypes = CUSTOMER_TYPES;
  readonly schemePhotos = SCHEME_PHOTOS;
  formatInr = formatInr;
  formatTenure = formatTenure;

  selected = signal<DepositScheme | null>(null);
  amountText = signal('');
  customerType = signal<CustomerType>('normal');
  tenureDays = signal(365);

  typedAmount = computed(() => Number(this.amountText()) || 0);
  amount = computed(() => {
    const s = this.selected();
    if (!s) return 0;
    return Math.min(s.maxAmount, Math.max(s.minAmount, this.typedAmount()));
  });
  amountNote = computed(() => {
    const s = this.selected();
    if (!s) return null;
    const typed = this.typedAmount();
    if (typed < s.minAmount) return `Minimum is ${formatInr(s.minAmount)} — showing that.`;
    if (typed > s.maxAmount) return `Maximum is ${formatInr(s.maxAmount)} — showing that.`;
    return null;
  });

  tenureChips = computed(() => {
    const s = this.selected();
    if (!s || s.calcType !== 'FD_LADDER') return [];
    return LADDER_TENURES.filter((c) => c.days >= (s.minTenureDays ?? 0) && c.days <= (s.maxTenureDays ?? Infinity));
  });
  effectiveTenureDays = computed(() => {
    const s = this.selected();
    if (!s) return 0;
    return s.calcType === 'FD_LADDER' ? this.tenureDays() : s.fixedTenureDays ?? 365;
  });

  rate = computed(() => {
    const s = this.selected();
    return s ? schemeRate(s, this.customerType(), this.tenureDays()) : 0;
  });
  growth = computed(() => {
    const s = this.selected();
    return s ? buildSchemeGrowthSeries(s, this.amount(), this.customerType(), this.tenureDays()) : [];
  });
  maturity = computed(() => {
    const pts = this.growth();
    return pts.length ? pts[pts.length - 1].value : 0;
  });
  /** Total the customer puts in: the lump sum, or every monthly installment for an RD. */
  invested = computed(() => {
    const s = this.selected();
    if (!s) return 0;
    return s.calcType === 'RD' ? this.amount() * rdInstallmentCount(s.fixedTenureDays ?? 0) : this.amount();
  });

  quickAmounts = computed(() => {
    const s = this.selected();
    if (!s) return [];
    const picks = s.calcType === 'RD' ? [1000, 5000, 10000, 25000] : [10000, 50000, 100000, 500000];
    return picks.filter((v) => v >= s.minAmount && v <= s.maxAmount);
  });

  pressAmountKey(key: string): void {
    this.amountText.update((v) => applyPadKey(v, key, 9));
  }

  open(scheme: DepositScheme): void {
    this.selected.set(scheme);
    this.amountText.set(String(scheme.defaultAmount));
    this.customerType.set('normal');
    this.tenureDays.set(365);
  }

  backToList(): void {
    this.selected.set(null);
  }

  headlineRate(scheme: DepositScheme): string {
    if (scheme.calcType === 'FD_LADDER') {
      const best = Math.max(...scheme.slabs!.map((slab) => slab.rates.normal));
      return `up to ${best}%`;
    }
    return `${scheme.rates!.normal}%`;
  }

  kindLabel(scheme: DepositScheme): string {
    const tenure = formatTenure(scheme.fixedTenureDays ?? 365);
    switch (scheme.calcType) {
      case 'FD_LADDER':
        return 'Fixed deposit · you choose the period';
      case 'FD_FIXED':
        return `Fixed deposit · ${tenure}`;
      case 'DOUBLING':
        return `Doubles your money · ${tenure}`;
      case 'RD':
        return `Monthly savings · ${tenure}`;
      case 'FLAT':
        return 'Savings account';
    }
  }

  isMonthly(scheme: DepositScheme): boolean {
    return scheme.calcType === 'RD';
  }

  installments(scheme: DepositScheme): number {
    return rdInstallmentCount(scheme.fixedTenureDays ?? 0);
  }

  requestCallback(): void {
    const s = this.selected();
    if (!s) return;
    this.callback.emit({ type: 'deposit', ref: s.id, label: s.name, amount: this.amount() });
  }
}
