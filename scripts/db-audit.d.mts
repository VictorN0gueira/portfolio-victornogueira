// Types for scripts/db-audit.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface AuditSection {
  title: string;
  rows: Record<string, unknown>[];
  error?: string;
}

export const AUDIT_ROLES: string[];
export const AUDIT_QUERIES: { title: string; sql: string }[];
export function runAudit(options: { query: (sql: string) => Promise<unknown> }): Promise<AuditSection[]>;
export function renderAudit(sections: AuditSection[]): string;
export function runAuditCli(options: {
  argv: string[];
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}): Promise<number>;
