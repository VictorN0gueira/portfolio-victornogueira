// Types for scripts/project-blur-regions.mjs, so the unit tests can import it under strict TypeScript without allowJs.
import type { BlurDefaults, BlurRegion } from './blur-regions.mjs';

export interface BlurSource {
  regions: readonly BlurRegion[];
  nameRegions: readonly BlurRegion[];
}

export const BLUR_DEFAULTS: Readonly<Required<BlurDefaults>>;
export const BLUR_SOURCES: Readonly<Record<string, BlurSource>>;
export function regionsFor(key: string, options?: { blurNames?: boolean }): BlurRegion[];
