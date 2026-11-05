import { Branch, LatLng } from './models';

const EARTH_RADIUS_KM = 6371;

/** Straight-line ("as the crow flies") distance in km, via the haversine formula. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Opens the branch's location in Google Maps — a plain link, no API key needed. */
export function googleMapsUrl(branch: Branch): string {
  return `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
}
