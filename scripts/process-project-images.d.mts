// Types for scripts/process-project-images.mjs, so the unit tests can import it under strict TypeScript without allowJs.

/** One image written for a project, as the manifest lists it. */
export interface ProcessedImage {
  key: string;
  width: number;
  height: number;
  widths: number[];
  hasShare: boolean;
  sizes: { width: number; height: number; bytes: number }[];
}

/** One original found in the input folder. */
export interface OriginalFile {
  slug: string;
  name: string;
  file: string;
}

export interface ParsedArguments {
  inputDir: string;
  outputDir: string;
  manifestFile: string;
  previewDir: string | null;
  clean: boolean;
  forceClean: boolean;
  keepNames: boolean;
}

export interface RunOptions {
  inputDir: string;
  outputDir: string;
  manifestFile: string;
  previewDir?: string | null;
  clean?: boolean;
  keepNames?: boolean;
  forceClean?: boolean;
  projectsFile?: string;
}

export interface RunResult {
  entries: ProcessedImage[];
  removed: string[];
  written?: number;
}

export const WIDTHS: number[];
export const COVER_SOURCES: Readonly<Record<string, string>>;
export class PipelineError extends Error {}
export function shareNameFor(slug: string): string;
export function parseArguments(argv: string[]): ParsedArguments;
export function checkFolders(inputDir: string, outputDir: string): void;
export function hasImageSignature(bytes: Uint8Array): boolean;
export function listOriginals(inputDir: string): OriginalFile[];
export function widthsFor(naturalWidth: number): number[];
export function run(options: RunOptions): Promise<RunResult>;
