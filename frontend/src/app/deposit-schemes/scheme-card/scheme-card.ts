import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  buildFdGrowthSeries,
  buildFdLadderGrowthSeries,
  buildFlatGrowthSeries,
  buildRdGrowthSeries,
  formatInr,
  formatTenure,
  rateFor,
  slabForDays,
} from '../calculators';
import { ChartLine } from '../chart-line/chart-line';
import { CustomerType, DepositScheme } from '../models';

const MONTHS_PER_DAY = 1 / 30.44;

@Component({
  selector: 'app-scheme-card',
  standalone: true,
  imports: [FormsModule, ChartLine],
  templateUrl: './scheme-card.html',
  styleUrl: './scheme-card.scss',
})
export class SchemeCard implements OnInit {
  @Input({ required: true }) scheme!: DepositScheme;

  customerType = signal<CustomerType>('normal');

  // used by FD_LADDER (slider = tenure in days)
  tenureDays = signal(0);
  // used by FD_FIXED / DOUBLING / RD / FLAT (slider = amount)
  amount = signal(0);

  isLadder = false;

  ngOnInit(): void {
    this.isLadder = this.scheme.calcType === 'FD_LADDER';
    this.amount.set(this.scheme.defaultAmount);
    if (this.isLadder) {
      this.tenureDays.set(this.scheme.maxTenureDays ?? 365);
    }
  }

  currentRate = computed(() => {
    const s = this.scheme;
    if (s.calcType === 'FD_LADDER') {
      const slab = slabForDays(s.slabs!, this.tenureDays());
      return rateFor(slab.rates, this.customerType());
    }
    return rateFor(s.rates!, this.customerType());
  });

  currentTenureDays = computed(() => (this.isLadder ? this.tenureDays() : this.scheme.fixedTenureDays ?? 0));

  growthPoints = computed(() => {
    const s = this.scheme;
    switch (s.calcType) {
      case 'FD_LADDER':
        return buildFdLadderGrowthSeries(this.scheme.defaultAmount, s.slabs!, this.customerType(), this.tenureDays());
      case 'FD_FIXED':
      case 'DOUBLING':
        return buildFdGrowthSeries(this.amount(), this.currentRate(), s.fixedTenureDays!);
      case 'RD': {
        const months = Math.max(1, Math.round((s.fixedTenureDays ?? 0) * MONTHS_PER_DAY));
        return buildRdGrowthSeries(this.amount(), this.currentRate(), months);
      }
      case 'FLAT':
        return buildFlatGrowthSeries(this.amount(), this.currentRate(), s.fixedTenureDays ?? 365);
    }
  });

  maturityValue = computed(() => {
    const pts = this.growthPoints();
    return pts.length ? pts[pts.length - 1].value : 0;
  });

  formatInr = formatInr;
  formatTenure = formatTenure;

  onCustomerTypeChange(type: CustomerType): void {
    this.customerType.set(type);
  }
}
