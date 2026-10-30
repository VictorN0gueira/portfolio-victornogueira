// Types for scripts/project-images-manifest.mjs, so the unit tests can import it under strict TypeScript without allowJs.

/** One line of the generated manifest (src/data/projectImages.ts). */
export interface ManifestEntry {
  key: string;
  width: number;
  height: number;
  widths: number[];
  hasShare: boolean;
}

export function renderManifest(entries: readonly ManifestEntry[]): string;
export function parseManifest(text: string): ManifestEntry[];
export function readManifestEntries(manifestFile: string): ManifestEntry[];
export function mergeEntries<Existing extends { key: string }, Fresh extends { key: string }>(
  existing: readonly Existing[],
  fresh: readonly Fresh[],
  cleanedSlugs?: ReadonlySet<string>,
): (Existing | Fresh)[];
export function writeFileAtomic(file: string, content: string): void;
