import { Component } from '@angular/core';
import { KIOSK_TEXT } from '../kiosk-text';

/** About the bank. Contact details are left for the bank to provide (docs/kiosk.md) rather than guessed. */
@Component({
  selector: 'app-kiosk-about',
  standalone: true,
  template: `
    <h2 class="title">{{ t.about.en }} <span class="te">· {{ t.about.te }}</span></h2>
    <div class="about">
      <div class="about__hero">
        <span class="about__name">The Vizianagaram District Co-operative Central Bank</span>
        <span class="te about__tag">{{ t.tagline.te }} · {{ t.tagline.en }}</span>
      </div>
      <div class="stats">
        <div class="stat"><strong>1916</strong><span>Serving since</span></div>
        <div class="stat"><strong>25</strong><span>Branches</span></div>
        <div class="stat"><strong>8+</strong><span>Deposit schemes</span></div>
      </div>
      <div class="about__card">
        <h3>Head Office</h3>
        <p>Vizianagaram</p>
        <p class="muted">Address, phone and working hours will be shown here once provided by the bank. Please ask at the counter.</p>
      </div>
    </div>
  `,
  styleUrl: './kiosk-about.scss',
})
export class KioskAbout {
  readonly t = KIOSK_TEXT;
}
