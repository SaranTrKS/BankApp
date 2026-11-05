import { Component, computed, input } from '@angular/core';
import qrcode from 'qrcode-generator';

/**
 * Renders a QR code as one SVG path (no innerHTML). Used on the kiosk instead of
 * links: tapping a link would take the kiosk browser off the kiosk page.
 */
@Component({
  selector: 'app-qr-code',
  standalone: true,
  template: `
    <svg [attr.viewBox]="viewBox()" shape-rendering="crispEdges" role="img" [attr.aria-label]="'QR code for ' + data()">
      <rect [attr.width]="size()" [attr.height]="size()" fill="#ffffff" />
      <path [attr.d]="path()" fill="#0b1f12" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        aspect-ratio: 1;
      }
      svg {
        width: 100%;
        height: 100%;
        border-radius: 12px;
      }
    `,
  ],
})
export class QrCode {
  data = input.required<string>();

  private static readonly MARGIN = 2;

  private qr = computed(() => {
    // Type 0 = smallest version that fits; 'M' error correction suits on-screen codes.
    const code = qrcode(0, 'M');
    code.addData(this.data());
    code.make();
    return code;
  });

  size = computed(() => this.qr().getModuleCount() + QrCode.MARGIN * 2);
  viewBox = computed(() => `0 0 ${this.size()} ${this.size()}`);

  path = computed(() => {
    const qr = this.qr();
    const count = qr.getModuleCount();
    const m = QrCode.MARGIN;
    let d = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col + m} ${row + m}h1v1h-1z`;
      }
    }
    return d;
  });
}
