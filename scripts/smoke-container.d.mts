// Types for scripts/smoke-container.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface SmokeFailure {
  name: string;
  problems: string[];
}

export function runSmoke(base: string): Promise<SmokeFailure[]>;
