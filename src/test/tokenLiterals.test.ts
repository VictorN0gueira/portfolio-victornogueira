// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Q:Q-24, Q:Q-26: the design tokens of src/styles/tokens.css are used instead of the literal they stand for. This
// scans the source (not the tests) and fails when a banned literal comes back. The tokens compute to the same CSS as
// the literals did (a pixel diff of the whole site proved it), so a replacement here never changes how the site looks.

const SRC = resolve(__dirname, '..');
const SOURCE_FILE = /\.(tsx?|css)$/;
const TEST_FILE = /\.test\.tsx?$/;

type Banned = { readonly name: string; readonly pattern: RegExp; readonly use: string; readonly exempt?: readonly string[] };

// Files of the lead channel that stay byte identical (contact form consent and error alert): they keep their own classes.
const FROZEN_LEAD_CHANNEL_FILES = ['components/contact/ContactConsent.tsx', 'components/contact/ContactErrorAlert.tsx'];
// Rings whose color is not white or ink: the accordion uses currentColor, the accessibility button swaps white and zinc.
const RING_WITH_OWN_COLOR_FILES = ['components/ui/Accordion.tsx', 'components/AccessibilityWidget.tsx'];

const BANNED: readonly Banned[] = [
  // Radius: the fluid radius of a card and the fluid radius of a section shell. The token definitions are the only place
  // the clamp() may be written.
  { name: 'card radius literal', pattern: /rounded-(?:[a-z]+-)?\[clamp\(20px, ?3vw, ?28px\)\]/, use: 'rounded-card', exempt: ['styles/tokens.css'] },
  { name: 'shell radius literal', pattern: /rounded-(?:[a-z]+-)?\[clamp\(24px, ?4vw, ?40px\)\]/, use: 'rounded-shell or rounded-t-shell', exempt: ['styles/tokens.css'] },
  { name: 'shell radius literal as a margin', pattern: /-m[a-z]?-\[clamp\(24px, ?4vw, ?40px\)\]/, use: '-mt-(--radius-shell)', exempt: ['styles/tokens.css'] },
  // Breakpoints and variants: the smallest phones and a phone held sideways have one name each in tokens.css.
  { name: 'arbitrary 360px breakpoint', pattern: /(?:min|max)-\[360px\]/, use: 'xs:', exempt: ['styles/tokens.css'] },
  { name: 'arbitrary landscape media query', pattern: /\[@media\(max-height:480px\)\]/, use: 'vn-landscape:' },
  // The same query written as plain CSS: index.css wraps it in @variant vn-landscape. Only the variant's own definition may
  // spell the number.
  // Stacking: the layers of the page (floating button, header, progress bar, list popover, widget, menu overlay, dialog,
  // skip link) come from the --vn-z-* scale of tokens.css, where their order is written once. z-10, z-0 and -z-10 are
  // local stacking inside one section (a glow behind a card) and stay as they are; every number from 20 up is a page layer.
  { name: 'z index number of a page layer', pattern: /(?<![\w-])-?z-(?:\[\d+\]|[2-9]\d|\d{3,})(?![\w-])/, use: 'z-(--vn-z-name) from the scale in tokens.css' },
  // Focus ring: 2px, offset 2px, white or ink. vn-focus-ring and vn-focus-ring-ink (components.css) draw it. The ring that
  // takes its color from the element (the accordion, the accessibility button, whose color follows its state) and the two
  // lead channel files that are frozen keep the spelled out form; so does any ring with another offset or no offset.
  {
    name: 'spelled out white or ink focus ring',
    pattern: /(?<![\w-])focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-(?:white|ink)(?![\w-])/,
    use: 'vn-focus-ring or vn-focus-ring-ink',
    exempt: FROZEN_LEAD_CHANNEL_FILES,
  },
  {
    name: 'focus ring width and offset spelled out before a color',
    pattern: /(?<![\w-])focus-visible:outline-2 focus-visible:outline-offset-2(?![\w-])/,
    use: 'vn-focus-ring or vn-focus-ring-ink',
    exempt: [...FROZEN_LEAD_CHANNEL_FILES, ...RING_WITH_OWN_COLOR_FILES],
  },
  { name: 'raw landscape media query in CSS', pattern: /@media \(max-height: ?480px\)/, use: '@variant vn-landscape', exempt: ['styles/tokens.css'] },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({ path: relative(SRC, path).replaceAll('\\', '/'), text: readFileSync(path, 'utf8') }));

describe('design tokens instead of literals', () => {
  it.each(BANNED)('no source file writes the $name (use $use)', ({ pattern, exempt = [] }) => {
    const offenders = files.filter(({ path, text }) => !exempt.includes(path) && pattern.test(text)).map(({ path }) => path);

    expect(offenders).toEqual([]);
  });
});
