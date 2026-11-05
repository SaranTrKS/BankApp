import { Component, output } from '@angular/core';
import { LOAN_TYPES } from '../../loan-application/models';
import { CallbackInterest } from '../callback.service';
import { LOAN_PHOTOS } from '../kiosk-photos';
import { KIOSK_TEXT } from '../kiosk-text';

/** One-line category descriptions until the bank provides real loan details (docs/kiosk.md). */
const LOAN_BLURBS: Record<string, string> = {
  agriculture: 'For crops, farm equipment and allied activities',
  gold: 'Quick loan against your gold ornaments',
  personal: 'For personal and family needs',
  home: 'To buy, build or repair a house',
  vehicle: 'For two-wheelers, cars and farm vehicles',
  education: 'For school, college and higher studies',
  business: 'For small and growing businesses',
  shg: 'For Self Help Groups',
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
        <div class="loan" [style.animation-delay.ms]="i * 50" [style.background-image]="loan.photo">
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
  readonly loans = LOAN_TYPES.map((loan) => ({
    ...loan,
    blurb: LOAN_BLURBS[loan.id] ?? '',
    photo: LOAN_PHOTOS[loan.id] ?? null,
  }));
}
