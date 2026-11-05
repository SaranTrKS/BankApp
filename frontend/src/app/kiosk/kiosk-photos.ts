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
