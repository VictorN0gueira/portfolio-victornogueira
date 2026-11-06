// Types for scripts/run-rls-tests.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export function assertLocalDatabase(raw: string | undefined): void;
export function runRlsTests(options: {
  url: string;
  psql?: string;
  root?: string;
  log?: (text: string) => void;
}): Promise<boolean>;
