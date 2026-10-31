// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from '@tailwindcss/node';
import { beforeAll, describe, expect, it } from 'vitest';
import { blockBody, declarations } from '../test/css';
import { allStylesCss, motionCss, ruleBodyFor, stillBody, stillUniversalBody, tokensCss, topRulesWithHeader } from '../test/styles';

const MEDIA_STILL = '@media (prefers-reduced-motion: reduce)';
const CLASS_STILL = '&:where(.a11y-no-animations, .a11y-no-animations *)';
const NEAR_ZERO = '.01ms';
const indexCss = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

// Every thing that moves, and what it does when motion is off. The list is written once in motion.css under `vn-still`,
// which stands for the system preference and for "Pausar animações" in the widget.
const STILL_LIST: ReadonlyArray<[selector: string, declarationsOff: string[]]> = [
  ['.vn-cursor', ['animation: none']],
  ['.vn-scan-line', ['display: none']],
  ['.vn-marquee', ['animation: none']],
  ['.vn-accordion-panel', ['transition: none']],
  ['.vn-accordion-icon', ['transition: none']],
  ['.vn-logo-tone', ['transition: none']],
  ['.vn-card-includes', ['transform: none', 'transition: none']],
  ['.vn-pulse-once', ['display: none']],
  ['.vn-cable-pulse', ['display: none']],
  ['.vn-tab-progress', ['display: none']],
  ['.vn-menu-panel', ['animation: none !important']],
  ['.vn-menu-overlay', ['animation: none !important']],
  ['.vn-choice-panel', ['animation: none !important']],
  ['.vn-dialog-panel', ['animation: none !important']],
  ['.vn-dialog-overlay', ['animation: none !important']],
];

describe('the vn-still variant', () => {
  it('is the system preference for reduced motion or the class the widget puts on the page, in one definition', () => {
    const variant = blockBody(tokensCss, '@custom-variant vn-still');

    expect(blockBody(variant, MEDIA_STILL)).toContain('@slot');
    expect(blockBody(variant, CLASS_STILL)).toContain('@slot');
  });
});

describe('what stops when motion is off', () => {
  it.each(STILL_LIST)('%s is on the list, with %j', (selector, expected) => {
    expect(declarations(stillBody(selector)).sort()).toEqual([...expected].sort());
  });

  it('puts every component that is stopped on the list once, not once per mechanism', () => {
    const stoppedSelectors = [...motionCss.matchAll(/^(\.vn-[\w-]+)[,\s{]/gm)].map((match) => match[1]);

    expect(new Set(stoppedSelectors)).toEqual(new Set(STILL_LIST.map(([selector]) => selector)));
  });

  it('shortens every other animation and transition to one near zero duration, whatever starts them', () => {
    const universal = stillUniversalBody();

    expect(universal).toContain(`animation-duration: ${NEAR_ZERO} !important`);
    expect(universal).toContain(`transition-duration: ${NEAR_ZERO} !important`);
    expect(universal).toContain('animation-iteration-count: 1 !important');
  });

  it('uses one near zero duration in the whole stylesheet set, the old two (.01ms and .001ms) are not both there', () => {
    expect(`${allStylesCss}\n${indexCss}`).not.toMatch(/0\.001ms|\.001ms/);
  });

  it('turns smooth scrolling off with the widget too: an anchor does not glide when animations are paused', () => {
    expect(stillUniversalBody()).toContain('scroll-behavior: auto !important');
    expect(declarations(blockBody(motionCss, 'html.a11y-no-animations'))).toEqual(['scroll-behavior: auto !important']);
  });

  it('keeps the smooth scroll of the page for visitors who did not ask for less motion', () => {
    expect(indexCss).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(blockBody(indexCss, '@media (prefers-reduced-motion: no-preference)')).toContain('scroll-behavior: smooth');
  });

  // A nested selector never matches a pseudo element, so these two are written out under both mechanisms.
  it('writes out the two pseudo element cases, for the preference and for the widget', () => {
    const supported = blockBody(motionCss, '@supports selector(::details-content)');

    expect(blockBody(blockBody(supported, MEDIA_STILL), '.vn-accordion::details-content')).toContain('transition: none');
    expect(blockBody(supported, '.a11y-no-animations .vn-accordion::details-content')).toContain('transition: none');
    expect(blockBody(motionCss, '.a11y-no-animations .vn-spotlight::before,\n.a11y-no-animations .vn-spotlight::after')).toMatch(
      /display:\s*none/,
    );
  });
});

// The variant must survive the real pipeline of the build: this compiles the three stylesheets like Tailwind does and
// looks at what each listed selector became.
describe('the compiled motion off list', () => {
  let compiled = '';

  beforeAll(async () => {
    const compiler = await compile(`@import "tailwindcss/theme.css" layer(theme);\n${allStylesCss}`, {
      base: resolve(__dirname, '../..'),
      onDependency: () => undefined,
    });
    compiled = compiler.build([]);
  });

  // Tailwind writes the variant as a media query rule, and as a `selector:where(<widget class>)` rule (`:is(a, b):where(...)`
  // for a list), which keeps the specificity of the base rule so the one later in the cascade wins.
  const WIDGET_WHERE = ':where(.a11y-no-animations, .a11y-no-animations *)';

  /** The declarations the compiled sheet gives `selector` under the media query. */
  const underMedia = (selector: string): string =>
    topRulesWithHeader(compiled, MEDIA_STILL)
      .map((body) => ruleBodyFor(body, selector))
      .join('\n');

  /** The declarations the compiled sheet gives `selector` through the widget class rule. */
  const underWidgetClass = (selector: string): string =>
    topRulesWithHeader(compiled, (header) => header.endsWith(WIDGET_WHERE) && header.includes(selector)).join('\n');

  it.each(STILL_LIST)('%s stops under the preference and under the widget class', (selector, expected) => {
    for (const declaration of expected) {
      expect(underMedia(selector), `${selector} under the media query`).toContain(declaration);
      expect(underWidgetClass(selector), `${selector} under the widget class`).toContain(declaration);
    }
  });

  it('applies the near zero reset to every element and pseudo element under the media query and under the class', () => {
    expect(underMedia('*')).toContain(`animation-duration: ${NEAR_ZERO} !important`);
    expect(compiled).toMatch(/:scope:where\(\.a11y-no-animations, \.a11y-no-animations \*\)\s+:before/);
    expect(compiled).toMatch(/:scope:where\(\.a11y-no-animations, \.a11y-no-animations \*\)\s+:after/);
  });
});
