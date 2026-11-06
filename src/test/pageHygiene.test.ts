// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PALETTE, toSixDigitHex } from './paletteCss';

// Q:Q-25: the visual leftovers of the old design must not come back to the source of the site. This scans src (not the
// tests, and not src/test, which holds the scanners themselves) and fails on a dark: variant, italic, text-[10px], a
// color family outside the palette in a color class, a decorative gradient class, a translucent white text and an
// off palette hex literal in TS or TSX (stylesheets are covered by styles/tokens.test.ts).

const SRC = resolve(__dirname, '..');
const SOURCE_FILE = /\.(?:tsx?|css)$/;
const TEST_FILE = /\.test\.tsx?$/;
const SCANNERS_FOLDER = 'test/';

const COLOR_PREFIX = '(?:text|bg|border|from|via|to|ring|fill|stroke|outline|divide|shadow|decoration|accent|caret)';
const FOREIGN_FAMILY = '(?:emerald|purple|violet|cyan|blue|green|red|amber|zinc|slate|stone|neutral|gray|indigo|pink|rose|orange|yellow|lime|teal|sky|fuchsia)';

interface Rule {
  readonly name: string;
  readonly pattern: RegExp;
}

// A Tailwind class is never glued to a word or a dash on its left: a variant (hover:) ends in a colon, which is allowed.
const RULES: readonly Rule[] = [
  // dark:text-white, not an object key such as `dark: 'text-vn-white'` or the token --color-vn-gray-dark: .
  { name: 'a dark: variant', pattern: /(?<![\w-])dark:(?=[\w[!-])/ },
  { name: 'italic', pattern: /(?<![\w-])italic(?![\w-])/ },
  { name: 'text-[10px]', pattern: /(?<![\w-])text-\[10px\]/ },
  { name: 'a color family outside the palette', pattern: new RegExp(`(?<![\\w-])${COLOR_PREFIX}-${FOREIGN_FAMILY}(?![a-z])`) },
  { name: 'a decorative gradient', pattern: /(?<![\w-])bg-(?:gradient|linear|radial|conic)|(?<![\w-])bg-\[(?:radial|conic)/ },
  { name: 'text-white/N (a translucent white that is no palette gray)', pattern: /(?<![\w-])text-white\/\d/ },
];

/**
 * The closed list of files allowed to break a rule, each with the reason. A file that no longer breaks any rule has to
 * leave the list (the last test), so the list only shrinks.
 */
const EXCEPTIONS: Readonly<Record<string, string>> = {
  'pages/PrivacyPage.tsx': 'frozen: the legal text and its classes are byte identical to the audited copy (frozenFiles.test.ts); legal.css restyles it from outside',
  'pages/LgpdPage.tsx': 'frozen: the legal text and its classes are byte identical to the audited copy (frozenFiles.test.ts); legal.css restyles it from outside',
  'pages/legal/legal.css': 'it names the old classes of the two frozen pages (italic, text-[10px], zinc, emerald) in its selectors, to restyle them from outside',
  'pages/legal/legalToc.ts': 'it names the old classes of the two frozen pages (text-[10px], bg-zinc-950) to find their kickers and black card in the rendered tree',
};

/** Files the off palette hex rule lets by, each with the reason. */
const HEX_EXCEPTIONS: Readonly<Record<string, string>> = {
  'sections/about/toolMarks.ts': 'TOOL_BRAND_COLORS: the original brand color of each tool, which the owner asked for explicitly; one named map, hex only here',
};

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly text: string;
}

function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : [];
  });
}

const FILES = sourceFiles(SRC)
  .map((path) => ({ file: relative(SRC, path).replaceAll('\\', '/'), text: readFileSync(path, 'utf8') }))
  .filter(({ file }) => !file.startsWith(SCANNERS_FOLDER));

function scanLines(file: string, text: string): Finding[] {
  return text.split('\n').flatMap((lineText, index) =>
    RULES.filter((rule) => rule.pattern.test(lineText)).map((rule) => ({ file, line: index + 1, rule: rule.name, text: lineText.trim().slice(0, 120) })),
  );
}

// A color is 3, 6 or 8 hex digits right after a #, not glued to a word or an entity (&#39;), so #a and #7-seus-direitos are anchors.
const HEX_COLOR = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g;

function scanHex(file: string, text: string): Finding[] {
  if (!/\.tsx?$/.test(file)) return [];
  return text.split('\n').flatMap((lineText, index) =>
    [...lineText.matchAll(HEX_COLOR)]
      .filter(([literal]) => !PALETTE.has(toSixDigitHex(literal) ?? ''))
      .map(([literal]) => ({ file, line: index + 1, rule: 'an off palette hex literal', text: `${literal} in ${lineText.trim().slice(0, 100)}` })),
  );
}

const describeFinding = ({ file, line, rule, text }: Finding) => `${file}:${line} ${rule}: ${text}`;
const lineFindings = FILES.flatMap(({ file, text }) => scanLines(file, text));
const hexFindings = FILES.flatMap(({ file, text }) => scanHex(file, text));

describe('the scanner sees what it is meant to ban', () => {
  const hit = (sample: string) => scanLines('x.tsx', sample).map(({ rule }) => rule);

  it.each([
    ['className="text-zinc-600 dark:text-zinc-400"', 'a dark: variant'],
    ['className="hover:dark:bg-vn-ink"', 'a dark: variant'],
    ['className="font-display italic"', 'italic'],
    ['className="text-[10px] uppercase"', 'text-[10px]'],
    ['className="border-emerald-500/20"', 'a color family outside the palette'],
    ['className="md:hover:bg-purple-500"', 'a color family outside the palette'],
    ['className="ring-zinc-200"', 'a color family outside the palette'],
    ['className="from-blue-500 to-cyan-400"', 'a color family outside the palette'],
    ['className="bg-gradient-to-r"', 'a decorative gradient'],
    ['className="bg-linear-to-b"', 'a decorative gradient'],
    ['className="bg-[radial-gradient(#fff,#000)]"', 'a decorative gradient'],
    ['className="text-white/60"', 'text-white/N (a translucent white that is no palette gray)'],
  ])('finds %s', (sample, rule) => {
    expect(hit(sample)).toContain(rule);
  });

  it.each([
    "dark: 'border-vn-gray-dark text-vn-gray-light'",
    '--color-vn-gray-dark: #4d4d4d;',
    'className="text-vn-gray-dark bg-vn-ink border-vn-gray-light"',
    'className="text-vn-white/60 bg-white/15 border-white/10"',
    'className="focus-visible:outline-vn-white text-vn-gray-mid"',
    'className="text-balance from-10% bg-none"',
    'const tone = "dark"; // the dark tone of the section',
  ])('lets %s by', (sample) => {
    expect(hit(sample)).toEqual([]);
  });

  it('finds an off palette hex in TS and not a palette one, and reads no stylesheet', () => {
    expect(scanHex('x.ts', "const a = '#ff0000';")).toHaveLength(1);
    expect(scanHex('x.ts', "const a = '#1a1a1a'; const b = '#FFF';")).toEqual([]);
    expect(scanHex('x.css', 'a { color: #ff0000; }')).toEqual([]);
    expect(scanHex('x.tsx', '<a href="#a">x</a> &#39; /privacidade#7-seus-direitos')).toEqual([]);
  });

  it('does read the source of the site and not only a folder', () => {
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES.some(({ file }) => file === 'pages/PrivacyPage.tsx')).toBe(true);
    expect(FILES.some(({ file }) => file.startsWith(SCANNERS_FOLDER))).toBe(false);
  });
});

describe('no visual leftover of the old design is in the source', () => {
  it.each(RULES.map(({ name }) => name))('has no %s outside the closed list of exceptions', (name) => {
    const offenders = lineFindings.filter(({ rule, file }) => rule === name && !(file in EXCEPTIONS)).map(describeFinding);

    expect(offenders).toEqual([]);
  });

  it('has no off palette hex literal in TS or TSX outside the closed list of exceptions', () => {
    const offenders = hexFindings.filter(({ file }) => !(file in HEX_EXCEPTIONS)).map(describeFinding);

    expect(offenders).toEqual([]);
  });
});

describe('the lists of exceptions', () => {
  it('only name files that still break a rule, so a file that was cleaned leaves the list', () => {
    const stale = Object.keys(EXCEPTIONS).filter((file) => !lineFindings.some((finding) => finding.file === file));
    const staleHex = Object.keys(HEX_EXCEPTIONS).filter((file) => !hexFindings.some((finding) => finding.file === file));

    expect([...stale, ...staleHex]).toEqual([]);
  });

  it('give a reason of its own to every entry', () => {
    for (const reason of [...Object.values(EXCEPTIONS), ...Object.values(HEX_EXCEPTIONS)]) {
      expect(reason.length).toBeGreaterThan(30);
    }
  });

  it('keep every brand color of the tools inside TOOL_BRAND_COLORS, the one map the exception names', () => {
    const lines = readFileSync(join(SRC, 'sections/about/toolMarks.ts'), 'utf8').split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith('export const TOOL_BRAND_COLORS'));
    const end = lines.findIndex((line, index) => index > start && line === '};');
    const hexLines = hexFindings.filter(({ file }) => file === 'sections/about/toolMarks.ts').map(({ line }) => line);

    expect(start).toBeGreaterThan(-1);
    expect(hexLines.length).toBeGreaterThanOrEqual(14);
    expect(hexLines.filter((line) => line <= start + 1 || line > end + 1)).toEqual([]);
  });
});
