// Types for scripts/process-founder-photo.mjs, so the unit tests can import it under strict TypeScript without allowJs.

export interface FounderPhotoFile {
  /** Width in pixels of the file. */
  width: number;
  format: 'avif' | 'webp';
  /** Path of the file from the root of the repository, with forward slashes. */
  file: string;
}

/** The files the script writes, in the order it writes them. Pure: it reads and writes nothing. */
export function founderPhotoPlan(): FounderPhotoFile[];
