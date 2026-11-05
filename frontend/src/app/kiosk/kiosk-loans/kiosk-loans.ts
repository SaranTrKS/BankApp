import { Component, output } from '@angular/core';
import { LOAN_TYPES } from '../../loan-application/models';
import { CallbackInterest } from '../callback.service';
import { KIOSK_TEXT } from '../kiosk-text';

/** Icons and one-line category descriptions until the bank provides real loan details (docs/kiosk.md). */
const LOAN_DISPLAY: Record<string, { icon: string; blurb: string }> = {
  agriculture: { icon: '🌾', blurb: 'For crops, farm equipment and allied activities' },
  gold: { icon: '🪙', blurb: 'Quick loan against your gold ornaments' },
  personal: { icon: '👤', blurb: 'For personal and family needs' },
  home: { icon: '🏠', blurb: 'To buy, build or repair a house' },
  vehicle: { icon: '🚗', blurb: 'For two-wheelers, cars and farm vehicles' },
  education: { icon: '🎓', blurb: 'For school, college and higher studies' },
  business: { icon: '🏪', blurb: 'For small and growing businesses' },
  shg: { icon: '👥', blurb: 'For Self Help Groups' },
};

/** Loan categories on the kiosk. No rates are published, so each offers a call back instead. */
@Component({
  selector: 'app-kiosk-loans',
  standalone: true,
  template: `
    <h2 class="title">{{ t.loans.en }} <span class="te">· {{ t.loans.te }}</span></h2>
    <p class="sub">Interest rates and eligibility are explained at the counter — or we can call you.</p>
    <div class="loans">
      @for (loan of loans; track loan.id; let i = $index) {
        <div class="loan" [style.animation-delay.ms]="i * 50">
          <span class="loan__icon">{{ loan.icon }}</span>
          <span class="loan__name">{{ loan.label }}</span>
          <span class="loan__blurb">{{ loan.blurb }}</span>
          <button type="button" class="loan__cta" (click)="callback.emit({ type: 'loan', ref: loan.id, label: loan.label })">
            📞 Call me about this
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './kiosk-loans.scss',
})
export class KioskLoans {
  callback = output<CallbackInterest>();

  readonly t = KIOSK_TEXT;
  readonly loans = LOAN_TYPES.map((loan) => ({ ...loan, ...(LOAN_DISPLAY[loan.id] ?? { icon: '💼', blurb: '' }) }));
}
