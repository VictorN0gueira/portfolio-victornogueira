// Types for scripts/check-bundle-budget.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface BudgetRow {
  file: string;
  rawBytes: number;
  gzipBytes: number;
}

export interface BudgetResult {
  rows: BudgetRow[];
  totalBytes: number;
  limitBytes: number;
}

export const BUDGET_KB: number;
export function criticalPathAssets(html: string): string[];
export function measureBudget(distDir: string, options?: { limitKb?: number }): BudgetResult;
export function formatReport(result: BudgetResult): string;
