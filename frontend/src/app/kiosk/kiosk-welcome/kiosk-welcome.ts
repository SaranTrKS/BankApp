import { Component, output } from '@angular/core';
import { KIOSK_TEXT } from '../kiosk-text';

/** The "attract" screen shown while nobody is using the kiosk: one big button over the hero photo. */
@Component({
  selector: 'app-kiosk-welcome',
  standalone: true,
  template: `
    <button type="button" class="attract" (click)="start.emit()">
      <span class="attract__top">
        <svg class="attract__logo" viewBox="0 0 100 100" aria-hidden="true">
          <polygon points="50,8 92,88 8,88" fill="none" stroke="currentColor" stroke-width="5" />
          <path d="M50 45 C40 45 34 55 38 65 C42 63 46 60 50 55 C54 60 58 63 62 65 C66 55 60 45 50 45 Z" fill="currentColor" />
        </svg>
        <span class="attract__brand">
          <span class="attract__bank">DCCB – VZM</span>
          <span class="attract__since">The Vizianagaram District Co-operative Central Bank · Since 1916</span>
        </span>
      </span>
      <span class="attract__bottom">
        <span class="attract__welcome">{{ t.welcome.en }} <span class="te">· {{ t.welcome.te }}</span></span>
        <span class="attract__tag">
          <span class="te">{{ t.tagline.te }}</span> · {{ t.tagline.en }}
        </span>
        <span class="attract__touch">
          <span class="pulse" aria-hidden="true"></span>
          {{ t.touchToBegin.en }}
          <span class="te">{{ t.touchToBegin.te }}</span>
        </span>
      </span>
    </button>
  `,
  styleUrl: './kiosk-welcome.scss',
})
export class KioskWelcome {
  start = output<void>();
  readonly t = KIOSK_TEXT;
}
