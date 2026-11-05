/**
 * Full-screen kiosk photos: real farmers and paddy fields, 1080×1920 WebP in public/kiosk/.
 * From Pexels (free licence, no attribution required — credits in docs/kiosk.md). To use the
 * bank's own photos, replace the files (portrait 1080×1920 is ideal; wider photos work too)
 * and adjust x/y.
 *
 * x / y = where the person is in the photo (% from left / top). The full-screen background
 * centres on x; the top photo band on each inner screen frames x and y.
 */
export const KIOSK_PHOTOS = {
  welcome: { src: '/kiosk/welcome.webp', x: 50, y: 50 },
  home: { src: '/kiosk/home.webp', x: 50, y: 76 },
  // 2880×1920 landscape: the two women planting are left of centre.
  savings: { src: '/kiosk/savings.webp', x: 32, y: 44 },
  loans: { src: '/kiosk/loans.webp', x: 50, y: 52 },
  fields: { src: '/kiosk/fields.webp', x: 50, y: 56 },
} as const;

export type KioskPhotoId = keyof typeof KIOSK_PHOTOS;

/**
 * Photos inside cards (720×480 WebP in public/kiosk/cards/, Pexels — credits in docs/kiosk.md).
 * Keys are the home-tile views, loan type ids (loan-application/models.ts) and deposit scheme
 * ids (deposit-schemes.data.ts). A card with no entry keeps the plain glass look.
 */
const card = (name: string) => `url(/kiosk/cards/${name}.webp)`;

export const TILE_PHOTOS: Record<string, string> = {
  deposits: card('sprout'),
  loans: card('tractor'),
  children: card('children'),
  branches: `url(${KIOSK_PHOTOS.fields.src})`,
};

export const LOAN_PHOTOS: Record<string, string> = {
  agriculture: card('tractor'),
  gold: card('gold'),
  personal: card('family'),
  home: card('house'),
  vehicle: card('bike'),
  education: card('classroom'),
  business: card('shop'),
  shg: card('women'),
};

export const SCHEME_PHOTOS: Record<string, string> = {
  'term-ladder': card('coins'),
  'mnsn-333': card('notes'),
  'mnsn-666': card('cash'),
  'double-plus': card('sprout'),
  'spl-rd-1y': card('jar'),
  'spl-rd-2y': card('jar'),
  'spl-rd-3y': card('jar'),
  savings: card('hands'),
};
