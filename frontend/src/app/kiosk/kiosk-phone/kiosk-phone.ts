import { Component } from '@angular/core';
import { KIOSK_TEXT } from '../kiosk-text';
import { QrCode } from '../qr-code/qr-code';

/** QR code that opens the full site on the visitor's own phone, where they can sign in and apply. */
@Component({
  selector: 'app-kiosk-phone',
  standalone: true,
  imports: [QrCode],
  template: `
    <h2 class="title">{{ t.phone.en }}</h2>
    <p class="te title-te">{{ t.phone.te }}</p>
    <div class="big-qr"><app-qr-code [data]="mainSiteUrl"></app-qr-code></div>
    <p class="sub">📱 {{ t.scanToOpen.en }}<br /><span class="te">{{ t.scanToOpen.te }}</span></p>
    <ol class="steps">
      <li>Open your phone's camera and point it at the code.</li>
      <li>Tap the link that appears.</li>
      <li>Sign in with your email to apply for deposits and loans.</li>
    </ol>
  `,
  styleUrl: './kiosk-phone.scss',
})
export class KioskPhone {
  readonly t = KIOSK_TEXT;
  readonly mainSiteUrl = `${window.location.origin}/`;
}
