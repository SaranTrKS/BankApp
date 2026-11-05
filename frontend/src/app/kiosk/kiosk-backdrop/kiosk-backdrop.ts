import { Component, input } from '@angular/core';
import { KIOSK_PHOTOS, KioskPhotoId } from '../kiosk-photos';

/**
 * Full-screen photo behind the kiosk. Every photo stays in the DOM (stacked, one visible),
 * so they all load up front and switching screens is an instant cross-fade.
 */
@Component({
  selector: 'app-kiosk-backdrop',
  standalone: true,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (photo of photos; track photo.id) {
      <div
        class="backdrop__photo"
        [class.backdrop__photo--on]="active() === photo.id"
        [class.backdrop__photo--drift]="welcome()"
        [style.background-image]="photo.url"
        [style.background-position]="photo.position"
      ></div>
    }
    <div class="backdrop__shade" [class.backdrop__shade--attract]="welcome()"></div>
  `,
  styleUrl: './kiosk-backdrop.scss',
})
export class KioskBackdrop {
  active = input.required<KioskPhotoId>();
  /** Welcome screen: brighter photo with a slow zoom. */
  welcome = input(false);

  readonly photos = (Object.keys(KIOSK_PHOTOS) as KioskPhotoId[]).map((id) => ({
    id,
    url: `url(${KIOSK_PHOTOS[id].src})`,
    position: `${KIOSK_PHOTOS[id].x}% 50%`,
  }));
}
