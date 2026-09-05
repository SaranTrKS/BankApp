import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { buildBalaBhavishyathStages, formatInr } from '../calculators';
import { DepositApplicationService } from '../deposit-application.service';
import { StageBarChart } from '../stage-bar-chart/stage-bar-chart';

const SCHEME_ID = 'bala-bhavishyath-nidhi';
const SCHEME_NAME = 'Bala Bhavishyath Nidhi';
const TOTAL_TENURE_DAYS = 21 * 365;

@Component({
  selector: 'app-bala-bhavishyath-card',
  standalone: true,
  imports: [FormsModule, StageBarChart],
  templateUrl: './bala-bhavishyath-card.html',
  styleUrl: './bala-bhavishyath-card.scss',
})
export class BalaBhavishyathCard {
  private auth = inject(AuthService);
  private depositService = inject(DepositApplicationService);

  isLoggedIn = this.auth.isLoggedIn;
  applying = signal(false);
  appliedId = signal<number | null>(null);
  applyError = signal<string | null>(null);

  monthlyDeposit = signal(1000);

  minAmount = 1000;
  maxAmount = 10000;
  amountStep = 500;

  stages = computed(() => buildBalaBhavishyathStages(this.monthlyDeposit()));
  finalMaturity = computed(() => this.stages()[this.stages().length - 1].maturity);

  formatInr = formatInr;

  onApply(): void {
    if (!this.isLoggedIn()) {
      this.applyError.set('Please log in above to apply for this deposit.');
      return;
    }
    this.applying.set(true);
    this.applyError.set(null);
    this.depositService
      .submit({
        scheme_id: SCHEME_ID,
        scheme_name: SCHEME_NAME,
        customer_type: 'normal',
        amount: this.monthlyDeposit(),
        tenure_days: TOTAL_TENURE_DAYS,
        projected_value: this.finalMaturity(),
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
