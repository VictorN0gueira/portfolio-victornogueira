// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOCKED_FEED_HOSTS, MOCKED_HOSTS, MOCKED_IMAGE_HOSTS, N8N_HOST } from '../../e2e/guardHosts';

// The n8n webhooks are the only lead channel of the business. e2e/n8nGuard.ts gives a test a catch-all net and the n8n
// route helpers, but only a spec that takes its `test` from it is covered: a plain `@playwright/test` spec could submit
// the form, or post to the webhook, and reach the real lead channel. So every spec that touches the form or the channel
// has to import `test` from the guard, and none may import `test` from `@playwright/test` as well.
//
// Known limits: this reads each spec's own text. A spec that drives the form only through a helper imported from another
// file shows none of the signs below; keep such helpers inside a spec, or add the sign of the helper here. The same goes
// for `page.goto(variable)`: the visit to the home or to the contact page is recognized only when the address is written
// in the call, so a spec that builds its address in a variable and has no other sign needs the guard by hand.

const E2E_DIR = resolve(__dirname, '../../e2e');
const SPEC_FILE = /\.(spec|test)\.ts$/;
// `import { ..., test, ... } from './n8nGuard'` (or '../n8nGuard' from a subfolder), over one line or many.
const TEST_FROM_GUARD = /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"](?:\.\.?\/)+n8nGuard['"]/;
const TEST_FROM_PLAYWRIGHT = /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"]@playwright\/test['"]/;

// What a spec that drives the form or the lead channel looks like: it fills a field, presses Enviar, opens the contact
// page or the form, names the webhook host or the WEBHOOKS constant, or posts a request itself.
const LEAD_CHANNEL_SIGNS = [
  /\.fill\(/,
  /\/enviar\/i/,
  /name:\s*['"]Enviar['"]/,
  /goto\([^)]*contato/,
  // The home mounts the real form (the final call to action), so a visit to it is a visit to the form.
  /goto\(\s*['"`]\/(?:#[^'"`]*)?['"`]/,
  /FORM_PATH/,
  /form\[name=["']contact["']\]/,
  /n8n\.vnone\.com\.br/,
  /\bWEBHOOKS\b/,
  /\brequest\.post\(/,
];

function touchesTheLeadChannel(source: string): boolean {
  return LEAD_CHANNEL_SIGNS.some((sign) => sign.test(source));
}

function isGuarded(source: string): boolean {
  return TEST_FROM_GUARD.test(source) && !TEST_FROM_PLAYWRIGHT.test(source);
}

/** The specs that touch the form or the channel without taking their `test` (and so the guard) from ./n8nGuard. */
export function findUnguardedSpecs(specs: Record<string, string>): string[] {
  return Object.entries(specs)
    .filter(([, source]) => touchesTheLeadChannel(source) && !isGuarded(source))
    .map(([name]) => name);
}

/** Every spec of the e2e folder and its subfolders, by path relative to it. */
function readSpecs(): Record<string, string> {
  if (!existsSync(E2E_DIR)) return {};

  const names = (readdirSync(E2E_DIR, { recursive: true }) as string[])
    .map((name) => name.split('\\').join('/'))
    .filter((name) => SPEC_FILE.test(name));
  return Object.fromEntries(names.map((name) => [name, readFileSync(join(E2E_DIR, name), 'utf8')]));
}

describe('the e2e specs that touch the lead channel', () => {
  it('finds the specs of the repository, so the check is not vacuous', () => {
    const names = Object.keys(readSpecs());

    expect(names).toContain('contact-form.spec.ts');
    expect(names).toContain('hero.spec.ts');
    expect(names).toContain('home.spec.ts');
    expect(names).toContain('scroll-lock.spec.ts');
    expect(names).toContain('devices.spec.ts');
    expect(names).toContain('visual.spec.ts');
  });

  it('all take their test from ./n8nGuard, never from @playwright/test', () => {
    expect(findUnguardedSpecs(readSpecs())).toEqual([]);
  });

  it('see the guard in the home spec, which mounts the real form', () => {
    const source = readSpecs()['home.spec.ts'];

    expect(touchesTheLeadChannel(source)).toBe(true);
    expect(isGuarded(source)).toBe(true);
  });

  it('see the guard in the scroll lock spec, which opens the home', () => {
    const source = readSpecs()['scroll-lock.spec.ts'];

    expect(touchesTheLeadChannel(source)).toBe(true);
    expect(isGuarded(source)).toBe(true);
  });

  // These two open the home through the helpers of homeSupport.ts, so the visit to it is not written in the spec: the
  // guard import is what protects them, and this pins it. They may look at the Enviar button (the WhatsApp button must
  // not cover it) but never press it nor submit the form.
  it.each(['devices.spec.ts', 'visual.spec.ts'])('see the guard in %s, which opens the home and walks it', (name) => {
    const source = readSpecs()[name];

    expect(isGuarded(source)).toBe(true);
    expect(source).not.toMatch(/\bsend\b[^;\n]*\.(?:click|tap|press|dispatchEvent)\(/);
    expect(source).not.toMatch(/\.fill\(|requestSubmit|\.submit\(/);
  });

  it('see the guard in the contact form spec', () => {
    const source = readSpecs()['contact-form.spec.ts'];

    expect(touchesTheLeadChannel(source)).toBe(true);
    expect(isGuarded(source)).toBe(true);
  });
});

describe('findUnguardedSpecs', () => {
  const field = "test('x', async ({ page }) => { await page.getByLabel('Nome').fill('a'); });";
  const unguarded = `import { test, expect } from '@playwright/test';\n${field}`;
  const guarded = `import { test, expect } from './n8nGuard';\n${field}`;

  it('flags a plain Playwright spec that fills a field', () => {
    expect(findUnguardedSpecs({ 'a.spec.ts': unguarded })).toEqual(['a.spec.ts']);
  });

  it('accepts the same spec once it takes its test from the guard', () => {
    expect(findUnguardedSpecs({ 'a.spec.ts': guarded })).toEqual([]);
  });

  it('accepts a multi line import and a spec in a subfolder that imports from ../n8nGuard', () => {
    const multiLine = `import {\n  n8nRoute,\n  test,\n  type N8nAnswer,\n} from '../n8nGuard';\n${field}`;

    expect(findUnguardedSpecs({ 'forms/a.spec.ts': multiLine })).toEqual([]);
  });

  it.each([
    ["await page.getByRole('button', { name: /enviar/i }).click();", 'a press on Enviar'],
    ["await page.goto('/contato');", 'a visit to the contact page'],
    ["await page.goto('/');", 'a visit to the home, which mounts the form'],
    ["await page.goto('/#metodo');", 'a visit to a section of the home'],
    ["await page.route('https://n8n.vnone.com.br/webhook/**', route);", 'the webhook host'],
    ['const form = page.locator(\'form[name="contact"]\');', 'the form locator'],
    ['await page.goto(FORM_PATH);', 'the form path constant'],
    ['await request.post(WEBHOOKS.email, { data: {} });', 'a direct post to the webhook'],
    ['const url = WEBHOOKS.whatsapp;', 'the WEBHOOKS constant'],
  ])('flags %s (%s) in a spec with no guard import', (line) => {
    const source = `import { test } from '@playwright/test';\n${line}`;

    expect(findUnguardedSpecs({ 'a.spec.ts': source })).toEqual(['a.spec.ts']);
  });

  // The false negative the reviewer found: the route helper comes from the guard, but the test (so the catch-all net) does not.
  it('flags a spec that imports n8nRoute from the guard but test from @playwright/test', () => {
    const source = `import { test, expect } from '@playwright/test';\nimport { n8nRoute } from './n8nGuard';\n${field}`;

    expect(findUnguardedSpecs({ 'a.spec.ts': source })).toEqual(['a.spec.ts']);
  });

  it('flags a spec that posts to the webhook with the guard test left out', () => {
    const source = `import { expect, test } from '@playwright/test';\ntest('x', async ({ request }) => { await request.post(WEBHOOKS.email); });`;

    expect(findUnguardedSpecs({ 'a.spec.ts': source })).toEqual(['a.spec.ts']);
  });

  it('flags a spec that takes test from both places', () => {
    const source = `import { test } from '@playwright/test';\nimport { test as guarded } from './n8nGuard';\n${field}`;

    expect(findUnguardedSpecs({ 'a.spec.ts': source })).toEqual(['a.spec.ts']);
  });

  it('leaves a spec that never touches the form alone', () => {
    const plain = "import { test, expect } from '@playwright/test';\ntest('x', async ({ page }) => { await page.goto('/sobre'); await page.request.get('/'); });";

    expect(findUnguardedSpecs({ 'plain.spec.ts': plain })).toEqual([]);
  });
});

describe('the hosts the network guard answers itself', () => {
  it('never hold the n8n host, the lead channel, nor the host of the page under test', () => {
    expect(MOCKED_HOSTS).not.toContain(N8N_HOST);
    for (const host of MOCKED_HOSTS) {
      expect(host.endsWith(N8N_HOST), host).toBe(false);
      expect(host, 'the page under test').not.toMatch(/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/);
    }
  });

  it('are bare host names: no scheme, no path, no wildcard, no port', () => {
    for (const host of MOCKED_HOSTS) expect(host).toMatch(/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/);
  });

  it('are the union of the image hosts and the feed hosts, with none twice', () => {
    expect([...MOCKED_HOSTS].sort()).toEqual([...MOCKED_IMAGE_HOSTS, ...MOCKED_FEED_HOSTS].sort());
    expect(new Set(MOCKED_HOSTS).size).toBe(MOCKED_HOSTS.length);
  });
});
