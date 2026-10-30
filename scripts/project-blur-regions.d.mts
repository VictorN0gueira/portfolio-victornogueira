// Types for scripts/project-blur-regions.mjs, so the unit tests can import it under strict TypeScript without allowJs.
import type { BlurDefaults, BlurRegion } from './blur-regions.mjs';

/** A pixel size of an original screenshot, the one the region coordinates were measured on. */
export interface BlurSize {
  width: number;
  height: number;
}

export interface BlurSource {
  sizes: BlurSize[];
  regions: readonly BlurRegion[];
  nameRegions: readonly BlurRegion[];
}

export interface RegionsForOptions {
  keepNames?: boolean;
}

export const BLUR_DEFAULTS: Readonly<Required<BlurDefaults>>;
export const BLUR_SOURCES: Readonly<Record<string, BlurSource>>;
export const ALLOWED_UNBLURRED: readonly string[];
export function blurKey(slug: string, fileName: string): string;
export function regionsFor(key: string, options?: RegionsForOptions): BlurRegion[];
export function blurProblem(key: string, size: BlurSize): string | null;
