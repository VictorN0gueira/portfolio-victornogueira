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

// A spec that only LOOKS at the Enviar button (its box, for the overlap with the WhatsApp button) must never press it,
// not directly and not by handing its locator to a helper, nor submit the form. Statements are read one by one:
//  - a statement that names Enviar (in any case) and does anything to it (click, tap, press, fill, a helper like
//    press(...), an evaluate whose callback clicks, dispatches an event or submits);
//  - a name bound to Enviar (`const send = ...Enviar...`) that is used for anything but a look at it;
//  - anywhere in the file: a button[type=submit] and a press of Enter (on the keyboard or on a field), which submit the
//    form without naming the button.
// Known limit: a locator for Enviar built by a function of another file is not followed; for that reason the helpers
// of homeSupport.ts are held to never name Enviar nor press a submit button (see findSubmitInHelpers).
const ENVIAR = /enviar/i;
const DOES_SOMETHING =
  /\.(?:click|dblclick|tap|press|fill|type|check|setChecked|dispatchEvent|requestSubmit|submit|focus)\(|\b(?:press|click|tap|choose\w*)\(/;
const A_LOOK = /^\.(?:boundingBox|evaluate|scrollIntoViewIfNeeded|isVisible|isEnabled|count|innerText|textContent)\(/;
const ACTS_IN_THE_PAGE = /\b(?:click|dispatchEvent|requestSubmit|submit)\b/;
const SUBMITS_WITHOUT_NAMING_THE_BUTTON = [String.raw`type=["']?submit`, String.raw`press\(\s*['"\x60]Enter`];
const BINDING = /\b(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=/;
// The one use of a record of controls that has Enviar among them: the loop that reads the height of each one.
const KNOWN_READ = /Object\.entries\(\w+\)/;

/** The text of the call that opens at `open` (the index of its "("), up to its matching ")". */
function callText(source: string, open: number): string {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '(') depth += 1;
    if (source[index] === ')') depth -= 1;
    if (depth === 0) return source.slice(open, index + 1);
  }
  return source.slice(open);
}

function isInlineEvaluateThatActs(statement: string): boolean {
  const open = statement.indexOf('.evaluate(');
  return open >= 0 && ACTS_IN_THE_PAGE.test(callText(statement, open + '.evaluate'.length));
}

/** True when this use of the name only looks at the button (a measure, `expect(name)`), or is the known read of the record. */
function isLook(source: string, use: RegExpMatchArray, name: string): boolean {
  const index = use.index ?? 0;
  const rest = source.slice(index + name.length);
  const before = source.slice(0, index);
  if (KNOWN_READ.test(before.slice(-16) + name + rest.slice(0, 1))) return true;
  if (/^\)/.test(rest) && /expect\(\s*$/.test(before)) return true;
  if (!A_LOOK.test(rest)) return false;
  return !rest.startsWith('.evaluate(') || !ACTS_IN_THE_PAGE.test(callText(rest, '.evaluate'.length));
}

export function findEnviarMisuse(source: string): string[] {
  const statements = source.split(';');
  const misuse: string[] = [];
  const names = new Set<string>();

  for (const statement of statements) {
    if (!ENVIAR.test(statement)) continue;
    if (DOES_SOMETHING.test(statement) || isInlineEvaluateThatActs(statement)) misuse.push(statement.trim().slice(0, 80));
    const name = BINDING.exec(statement)?.[1];
    if (name) names.add(name);
  }
  for (const name of names) {
    const declaration = statements.find((statement) => BINDING.exec(statement)?.[1] === name && ENVIAR.test(statement));
    for (const use of source.matchAll(new RegExp(`(?<![A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`, 'g'))) {
      const start = use.index ?? 0;
      const sentence = source.slice(source.lastIndexOf(';', start) + 1, source.indexOf(';', start)).trim();
      if (declaration !== undefined && declaration.trim() === sentence) continue;
      if (!isLook(source, use, name)) misuse.push(`${name} used in: ${sentence.slice(0, 80)}`);
    }
  }
  for (const pattern of SUBMITS_WITHOUT_NAMING_THE_BUTTON) {
    if (new RegExp(pattern).test(source)) misuse.push(`submits without naming the button: ${pattern}`);
  }
  return misuse;
}

// The helpers shared by the specs (homeSupport.ts) can press only the choice pills of the hero (choosePillOption); they
// never name Enviar, fill a field, press a submit button or submit the form.
export function findSubmitInHelpers(source: string): string[] {
  const withoutPillHelper = source.replace(/export async function choosePillOption[\s\S]*?\n}\n/, '');
  const forbidden = [
    /Enviar/,
    /\.(?:fill|type|check|setChecked|press|requestSubmit|submit|dblclick)\(/,
    /\.(?:click|tap)\(/,
    /type=["']submit["']/,
  ];
  return forbidden.filter((pattern) => pattern.test(withoutPillHelper)).map(String);
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
  // not cover it) but never press it, by hand or through a helper, nor submit the form.
  it.each(['devices.spec.ts', 'visual.spec.ts'])('see the guard in %s, which opens the home and walks it', (name) => {
    const source = readSpecs()[name];

    expect(isGuarded(source)).toBe(true);
    expect(findEnviarMisuse(source)).toEqual([]);
    expect(source).not.toMatch(/\.fill\(|requestSubmit|\.submit\(/);
  });

  it('keep the home spec from pressing Enviar too (it measures the button and never presses it)', () => {
    expect(findEnviarMisuse(readSpecs()['home.spec.ts'])).toEqual([]);
  });

  it('keep the shared helpers of the home specs from pressing a submit button or filling the form', () => {
    const source = readFileSync(join(E2E_DIR, 'homeSupport.ts'), 'utf8');

    expect(findSubmitInHelpers(source)).toEqual([]);
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

  it('hold the hosts the pages still load from and no more: the self hosted minio is gone', () => {
    expect([...MOCKED_IMAGE_HOSTS]).toEqual(['images.unsplash.com']);
    expect([...MOCKED_FEED_HOSTS]).toEqual(['dev.to', 'www.tabnews.com.br', 'qpcwoioflaxiasmcdfbd.supabase.co']);
    expect(MOCKED_HOSTS.some((host) => host.includes('minio'))).toBe(false);
  });
});

describe('findEnviarMisuse', () => {
  const declare = "const send = form.getByRole('button', { name: 'Enviar', exact: true });";

  it('accepts the known read of a record of controls that has Enviar, and no more', () => {
    const source = "const controls: Record<string, Locator> = { Enviar: form.getByRole('button', { name: 'Enviar' }) };\nfor (const [name, control] of Object.entries(controls)) { await control.boundingBox(); }";

    expect(findEnviarMisuse(source)).toEqual([]);
  });

  it('accepts a measure of Enviar through evaluate that does not act', () => {
    const source = `${declare}
await send.evaluate((el) => el.scrollIntoView({ block: 'center' }));`;

    expect(findEnviarMisuse(source)).toEqual([]);
  });

  it('accepts a spec that only looks at the Enviar button', () => {
    const source = `${declare}
await send.evaluate((el) => el.scrollIntoView());
const box = await send.boundingBox();
await expect(send).toBeVisible();`;

    expect(findEnviarMisuse(source)).toEqual([]);
  });

  // The mutations the reviewer asked for: each way of pressing Enviar that a plain look at `send.click(` would miss.
  it.each([
    ['a click', `${declare}
await send.click();`],
    ['a tap', `${declare}
await send.tap();`],
    ['the locator handed to a helper', `${declare}
await press(send);`],
    ['the locator handed to the pill helper of the specs', `${declare}
await choosePillOption(page, send, 'x');`],
    ['an inline press', "await form.getByRole('button', { name: 'Enviar' }).press('Enter');"],
    ['a helper on an inline locator', "await press(form.getByRole('button', { name: 'Enviar' }));"],
    ['a rename and a click', `${declare}
const again = send;
await again.click();`],
    ['a keyboard press on the locator', `${declare}
await send.press('Enter');`],
    ['a regular expression name in lower case', "await form.getByRole('button', { name: /enviar/i }).click();"],
    ['the same through a constant', "const again = form.getByRole('button', { name: /enviar/i });\nawait again.click();"],
    ['a lower case string name', "await form.getByRole('button', { name: 'enviar' }).click();"],
    ['a submit button selector', "await form.locator('button[type=submit]').click();"],
    ['a quoted submit button selector', `await form.locator('button[type="submit"]').tap();`],
    ['Enter on the keyboard', "await page.keyboard.press('Enter');"],
    ['Enter on a field', "await field.press(\"Enter\");"],
    ['a click inside evaluate', `${declare}
await send.evaluate((el) => el.click());`],
    ['a dispatched event inside evaluate', `${declare}
await send.evaluate((el) => { el.dispatchEvent(new Event('click')); });`],
    ['a submit inside evaluate on an inline locator', "await form.getByRole('button', { name: 'Enviar' }).evaluate((el) => el.form.requestSubmit());"],
    ['a click on a record of controls that has Enviar', "const controls = { Enviar: form.getByRole('button', { name: 'Enviar' }) };\nawait controls.Enviar.click();"],
  ])('flags %s', (_label, source) => {
    expect(findEnviarMisuse(source).length).toBeGreaterThan(0);
  });
});

describe('findSubmitInHelpers', () => {
  const pillHelper = `export async function choosePillOption(page: Page) {
  await page.getByRole("button").click();
}
`;

  it('accepts a helper file whose only click is the pill helper', () => {
    expect(findSubmitInHelpers(`${pillHelper}export const x = 1;`)).toEqual([]);
  });

  it.each([
    ['a helper that names Enviar', `${pillHelper}export const send = (p) => p.getByRole('button', { name: 'Enviar' });`],
    ['a helper that fills a field', `${pillHelper}export const f = (p) => p.getByLabel('Nome').fill('a');`],
    ['a helper that clicks something else', `${pillHelper}export const c = (p) => p.getByRole('button').click();`],
    ['a helper that submits the form', `${pillHelper}export const s = (p) => p.locator('form').requestSubmit();`],
  ])('flags %s', (_label, source) => {
    expect(findSubmitInHelpers(source).length).toBeGreaterThan(0);
  });
});
