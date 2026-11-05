import { Component, computed, output, signal } from '@angular/core';
import {
  BALA_BHAVISHYATH_MAX_MONTHLY,
  BALA_BHAVISHYATH_MIN_MONTHLY,
  BALA_BHAVISHYATH_RATE,
  buildBalaBhavishyathStages,
  formatInr,
} from '../../deposit-schemes/calculators';
import { StageBarChart } from '../../deposit-schemes/stage-bar-chart/stage-bar-chart';
import { CallbackInterest } from '../callback.service';
import { KIOSK_TEXT } from '../kiosk-text';

const MONTHLY_CHOICES = [1000, 2000, 3000, 5000, 7500, 10000];

/** Bala Bhavishyath Nidhi on the kiosk — same stages/formula as the main site's card. */
@Component({
  selector: 'app-kiosk-children',
  standalone: true,
  imports: [StageBarChart],
  template: `
    <h2 class="title">{{ t.children.en }} <span class="te">· {{ t.children.te }}</span></h2>
    <p class="sub">Bala Bhavishyath Nidhi — save every month for 7 years, the money keeps growing until your child turns 21.</p>

    <div class="facts">
      <div class="fact"><span>For children</span><strong>0 – 18 years</strong></div>
      <div class="fact"><span>Monthly deposit</span><strong>{{ formatInr(min) }} – {{ formatInr(max) }}</strong></div>
      <div class="fact"><span>Interest</span><strong>{{ rate }}% p.a.</strong></div>
      <div class="fact"><span>Maturity</span><strong>After 21 years</strong></div>
    </div>

    <div class="label">Monthly deposit</div>
    <div class="chips">
      @for (value of choices; track value) {
        <button type="button" class="chip" [class.chip--on]="monthly() === value" (click)="monthly.set(value)">
          {{ formatInr(value) }}
        </button>
      }
    </div>

    <div class="result">
      <div class="result__label">{{ t.youWillGet.en }} <span class="te">{{ t.youWillGet.te }}</span></div>
      <div class="result__value" data-testid="bb-maturity">{{ formatInr(finalMaturity()) }}</div>
      <div class="result__meta">You put in {{ formatInr(invested()) }} over 7 years</div>
      <app-stage-bar-chart class="chart" [stages]="stages()" [dark]="true"></app-stage-bar-chart>
      <div class="stages">
        @for (stage of stages(); track stage.label) {
          <div class="stage">
            <span>{{ stage.label }}</span>
            <strong>{{ formatInr(stage.maturity) }}</strong>
          </div>
        }
      </div>
    </div>

    <button type="button" class="cta" (click)="requestCallback()">
      📞 {{ t.interested.en }}
      <span class="cta__te">{{ t.interested.te }}</span>
    </button>
    <p class="disclaimer">Figures are estimates. Final rates and terms are confirmed at the branch.</p>
  `,
  styleUrl: './kiosk-children.scss',
})
export class KioskChildren {
  callback = output<CallbackInterest>();

  readonly t = KIOSK_TEXT;
  readonly min = BALA_BHAVISHYATH_MIN_MONTHLY;
  readonly max = BALA_BHAVISHYATH_MAX_MONTHLY;
  readonly rate = BALA_BHAVISHYATH_RATE;
  readonly choices = MONTHLY_CHOICES;
  formatInr = formatInr;

  monthly = signal(5000);
  stages = computed(() => buildBalaBhavishyathStages(this.monthly()));
  finalMaturity = computed(() => this.stages()[this.stages().length - 1].maturity);
  invested = computed(() => this.stages()[0].investment);

  requestCallback(): void {
    this.callback.emit({
      type: 'deposit',
      ref: 'bala-bhavishyath-nidhi',
      label: 'Bala Bhavishyath Nidhi',
      amount: this.monthly(),
    });
  }
}
