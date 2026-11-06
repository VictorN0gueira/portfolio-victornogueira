// Types for scripts/run-rls-tests.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface ParsedDatabase {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

export function parseLocalDatabaseUrl(raw: string | undefined): ParsedDatabase;
export function assertLocalDatabase(raw: string | undefined): void;
export function psqlEnvironment(
  base: Record<string, string | undefined>,
  parsed: ParsedDatabase,
): Record<string, string>;
export function runRlsTests(options: {
  url: string;
  psql?: string;
  root?: string;
  log?: (text: string) => void;
  spawn?: (
    command: string,
    args: string[],
    options: { input?: string; env: Record<string, string>; encoding: string; maxBuffer: number },
  ) => {
    status: number | null;
    stdout?: string;
    stderr?: string;
    error?: Error;
  };
  baseEnv?: Record<string, string | undefined>;
}): Promise<boolean>;
