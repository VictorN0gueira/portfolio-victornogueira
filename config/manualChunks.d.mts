// Types for config/manualChunks.mjs, so vite.config.ts and the unit tests can import it under strict TypeScript.
export function packageOf(id: string): string | null;
export function manualChunks(id: string): string | undefined;
