// Types for scripts/project-images-usage.mjs, so the unit tests can import it under strict TypeScript without allowJs.

export class UsageScanError extends Error {}
export function stringLiterals(source: string): Set<string>;
export function findUsedKeys(source: string, keys: readonly string[]): string[];
export function findUsedKeysInFile(file: string, keys: readonly string[]): string[];
