// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The n8n webhooks are the only lead channel of the business. e2e/n8nGuard.ts gives a test a catch-all net and the n8n
// route helpers, but only a spec that takes its `test` from it is covered. So a spec that touches the contact form has to
// import from './n8nGuard': a plain `@playwright/test` spec could submit the form and reach the real webhooks.

const E2E_DIR = resolve(__dirname, '../../e2e');
const GUARD_IMPORT = /from\s*['"]\.\/n8nGuard['"]/;
const PLAYWRIGHT_TEST_IMPORT = /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"]@playwright\/test['"]/;

// What a spec that drives the form looks like: it fills a field, presses Enviar, opens the contact page or the form,
// or names the webhook host.
const FORM_SIGNS = [
  /\.fill\(/,
  /\/enviar\/i/,
  /name:\s*['"]Enviar['"]/,
  /goto\([^)]*contato/,
  /FORM_PATH/,
  /form\[name=["']contact["']\]/,
  /n8n\.vnone\.com\.br/,
];

function touchesTheForm(source: string): boolean {
  return FORM_SIGNS.some((sign) => sign.test(source));
}

/** The specs that touch the form without taking their `test` (and so the guard) from ./n8nGuard. */
export function findUnguardedFormSpecs(specs: Record<string, string>): string[] {
  return Object.entries(specs)
    .filter(([, source]) => touchesTheForm(source) && !GUARD_IMPORT.test(source))
    .map(([name]) => name);
}

function readSpecs(): Record<string, string> {
  if (!existsSync(E2E_DIR)) return {};

  return Object.fromEntries(
    readdirSync(E2E_DIR)
      .filter((name) => name.endsWith('.spec.ts'))
      .map((name) => [name, readFileSync(join(E2E_DIR, name), 'utf8')]),
  );
}

describe('the e2e specs that touch the contact form', () => {
  it('finds the specs of the repository, so the check is not vacuous', () => {
    const names = Object.keys(readSpecs());

    expect(names).toContain('contact-form.spec.ts');
    expect(names).toContain('hero.spec.ts');
  });

  it('all take their test from ./n8nGuard, never straight from @playwright/test', () => {
    expect(findUnguardedFormSpecs(readSpecs())).toEqual([]);
  });

  it('see the guard in the contact form spec', () => {
    const source = readSpecs()['contact-form.spec.ts'];

    expect(touchesTheForm(source)).toBe(true);
    expect(GUARD_IMPORT.test(source)).toBe(true);
    expect(PLAYWRIGHT_TEST_IMPORT.test(source)).toBe(false);
  });
});

describe('findUnguardedFormSpecs', () => {
  const unguarded = "import { test, expect } from '@playwright/test';\ntest('x', async ({ page }) => { await page.getByLabel('Nome').fill('a'); });";
  const guarded = "import { test, expect } from './n8nGuard';\ntest('x', async ({ page }) => { await page.getByLabel('Nome').fill('a'); });";

  it('flags a plain Playwright spec that fills a field', () => {
    expect(findUnguardedFormSpecs({ 'a.spec.ts': unguarded })).toEqual(['a.spec.ts']);
  });

  it('accepts the same spec once it takes its test from the guard', () => {
    expect(findUnguardedFormSpecs({ 'a.spec.ts': guarded })).toEqual([]);
  });

  it.each([
    ["await page.getByRole('button', { name: /enviar/i }).click();", 'a press on Enviar'],
    ["await page.goto('/contato');", 'a visit to the contact page'],
    ["await page.route('https://n8n.vnone.com.br/webhook/**', route);", 'the webhook host'],
    ["const form = page.locator('form[name=\"contact\"]');", 'the form locator'],
    ["await page.goto(FORM_PATH);", 'the form path constant'],
  ])('flags %s (%s) in a spec with no guard import', (line) => {
    expect(findUnguardedFormSpecs({ 'a.spec.ts': `import { test } from '@playwright/test';\n${line}` })).toEqual(['a.spec.ts']);
  });

  it('leaves a spec that never touches the form alone', () => {
    const plain = "import { test, expect } from '@playwright/test';\ntest('x', async ({ page }) => { await page.goto('/'); });";

    expect(findUnguardedFormSpecs({ 'hero.spec.ts': plain })).toEqual([]);
  });
});
