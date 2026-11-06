// Types for scripts/db-migrate.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface Migration {
  id: string;
  file: string;
  sql: string;
}

export interface Credentials {
  url?: string;
  serviceKey?: string;
}

export type Query = (sql: string) => Promise<unknown>;

export function listMigrations(dir: string): Promise<Migration[]>;
export function pendingMigrations(all: Migration[], appliedIds: string[]): Migration[];
export function renderPlan(pending: { id: string }[]): string;
export function runMigrations(options: {
  query: Query;
  dir: string;
  apply: boolean;
  appliedIds?: string[];
}): Promise<{ applied: string[]; planned: string[] }>;
export function readAppliedIds(query: Query): Promise<string[]>;
export function parseCredentialsFile(text: string): Credentials;
export function resolveCredentials(options: { env: Record<string, string | undefined>; file: string }): {
  url: string;
  serviceKey: string;
};
export function createQuery(options: { url: string; serviceKey: string; fetch?: typeof fetch }): Query;
export function runCli(options: {
  argv: string[];
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}): Promise<number>;
