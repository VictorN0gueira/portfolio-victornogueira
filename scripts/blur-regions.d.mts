// Types for scripts/blur-regions.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface CircleRegion {
  shape: 'circle';
  cx: number;
  cy: number;
  r: number;
  sigma?: number;
  feather?: number;
}

export interface RectRegion {
  shape: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  sigma?: number;
  feather?: number;
}

export type BlurRegion = CircleRegion | RectRegion;

export interface BlurDefaults {
  sigma?: number;
  feather?: number;
}

export interface RegionBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const DEFAULT_SIGMA: number;
export const DEFAULT_FEATHER: number;
export function regionBounds(region: BlurRegion): RegionBounds;
export function regionReach(region: BlurRegion, defaults?: BlurDefaults): number;
export function applyBlurRegions(
  input: Buffer,
  regions: readonly BlurRegion[],
  defaults?: BlurDefaults,
): Promise<Buffer>;
