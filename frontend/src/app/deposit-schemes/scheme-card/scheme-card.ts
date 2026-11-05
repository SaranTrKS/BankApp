import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { buildSchemeGrowthSeries, formatInr, formatTenure, schemeRate } from '../calculators';
import { ChartLine } from '../chart-line/chart-line';
import { DepositApplicationService } from '../deposit-application.service';
import { CustomerType, DepositScheme } from '../models';

@Component({
  selector: 'app-scheme-card',
  standalone: true,
  imports: [FormsModule, ChartLine],
  templateUrl: './scheme-card.html',
  styleUrl: './scheme-card.scss',
})
export class SchemeCard implements OnInit {
  @Input({ required: true }) scheme!: DepositScheme;

  // Set from the single "Deposit Amount" field on the page — no per-card amount slider.
  private rawGlobalAmount = signal(0);
  @Input({ required: true })
  set globalAmount(value: number) {
    this.rawGlobalAmount.set(value);
  }

  private auth = inject(AuthService);
  private depositService = inject(DepositApplicationService);

  isLoggedIn = this.auth.isLoggedIn;
  applying = signal(false);
  appliedId = signal<number | null>(null);
  applyError = signal<string | null>(null);

  customerType = signal<CustomerType>('normal');

  // used by FD_LADDER (still a slider = tenure in days)
  tenureDays = signal(0);

  // the global amount, clamped into this scheme's own valid range
  amount = computed(() => {
    const s = this.scheme;
    return Math.min(s.maxAmount, Math.max(s.minAmount, this.rawGlobalAmount()));
  });
  isAmountClamped = computed(() => this.amount() !== this.rawGlobalAmount());

  isLadder = false;

  ngOnInit(): void {
    this.isLadder = this.scheme.calcType === 'FD_LADDER';
    if (this.isLadder) {
      this.tenureDays.set(365);
    }
  }

  currentRate = computed(() => schemeRate(this.scheme, this.customerType(), this.tenureDays()));

  currentTenureDays = computed(() => (this.isLadder ? this.tenureDays() : this.scheme.fixedTenureDays ?? 0));

  growthPoints = computed(() =>
    buildSchemeGrowthSeries(this.scheme, this.amount(), this.customerType(), this.tenureDays())
  );

  maturityValue = computed(() => {
    const pts = this.growthPoints();
    return pts.length ? pts[pts.length - 1].value : 0;
  });

  applicationAmount = computed(() => this.amount());

  formatInr = formatInr;
  formatTenure = formatTenure;

  onCustomerTypeChange(type: CustomerType): void {
    this.customerType.set(type);
  }

  onApply(): void {
    if (!this.isLoggedIn()) {
      this.applyError.set('Please log in above to apply for this deposit.');
      return;
    }
    this.applying.set(true);
    this.applyError.set(null);
    this.depositService
      .submit({
        scheme_id: this.scheme.id,
        scheme_name: this.scheme.name,
        customer_type: this.customerType(),
        amount: this.applicationAmount(),
        tenure_days: this.currentTenureDays(),
        projected_value: this.maturityValue(),
      })
      .subscribe({
        next: (res) => {
          this.applying.set(false);
          this.appliedId.set(res.id);
        },
        error: () => {
          this.applying.set(false);
          this.applyError.set('Could not submit your application. Please try again.');
        },
      });
  }
}
