/** Mirrors backend/branches.py via GET /branches (no manager emails). */
export interface Branch {
  code: number;
  name: string;
  lat: number;
  lng: number;
  /** True while lat/lng is the town centre rather than the branch building. */
  approx: boolean;
}

export interface LatLng {
  lat: number;
  lng: number;
}
