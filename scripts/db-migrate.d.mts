// Types for scripts/db-migrate.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface Migration {
  id: string;
  file: string;
  sql: string;
}

export interface RegistryRow {
  id: string;
  sha256: string | null;
}

export interface Credentials {
  url?: string;
  serviceKey?: string;
}

export type Query = (sql: string) => Promise<unknown>;

export interface CliOptions {
  apply: boolean;
  yes: boolean;
  host: string | undefined;
  dir: string;
  credentials: string | undefined;
}

export function listMigrations(dir: string): Promise<Migration[]>;
export function sha256Of(sql: string): string;
export function pendingMigrations(all: Migration[], appliedIds: string[]): Migration[];
export function editedMigrations(all: { id: string; sql: string }[], registry: RegistryRow[]): string[];
export function assertTransactional(migration: { id: string; sql: string }): void;
export function renderPlan(pending: { id: string }[]): string;
export function buildMigrationSql(migration: { id: string; sql: string }): string;
export function runMigrations(options: {
  query: Query;
  dir: string;
  apply: boolean;
  applied?: RegistryRow[];
}): Promise<{ applied: string[]; planned: string[] }>;
export function readRegistry(query: Query): Promise<RegistryRow[]>;
export function parseCredentialsFile(text: string): Credentials;
export function resolveCredentials(options: { env: Record<string, string | undefined>; file: string }): {
  url: string;
  serviceKey: string;
};
export function assertPinnedHost(url: string, expectedHost: string | undefined): void;
export function assertTlsChecked(env: Record<string, string | undefined>): void;
export function createQuery(options: { url: string; serviceKey: string; fetch?: typeof fetch }): Query;
export function parseArgs(argv: string[], options?: { allowed?: string[] }): CliOptions;
export function connect(options: {
  options: CliOptions;
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
}): {
  url: string;
  serviceKey: string;
  query: Query;
};
export function runCli(options: {
  argv: string[];
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}): Promise<number>;
