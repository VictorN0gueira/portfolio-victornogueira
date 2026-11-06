// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blockBody, declarations } from '../test/css';
import { allStylesCss as css } from '../test/styles';

// The accessibility tab: its colours ease as transition-colors did on main (300ms, the Tailwind curve), and the step aside
// of useTabDodge slides with a translate whose length and curve are the ones of the slide of a moved tab (floatingLayout.ts,
// set inline on the button), so that none of the three can drift from the others.

const COLOUR_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'outline-color',
  'text-decoration-color',
  'fill',
  'stroke',
];
const TAILWIND_CURVE = 'cubic-bezier(0.4, 0, 0.2, 1)';

const body = blockBody(css, '.vn-tab-trigger');

describe('components.css .vn-tab-trigger', () => {
  it('draws the step aside with a translate from the two lengths the hook writes', () => {
    expect(declarations(body)).toContain('translate: var(--vn-dodge-x, 0px) var(--vn-dodge-y, 0px)');
  });

  it('eases every colour property of transition-colors for 300ms on the Tailwind curve, and nothing else on that curve', () => {
    const transition = declarations(body).find((line) => line.startsWith('transition:')) ?? '';
    for (const property of COLOUR_PROPERTIES) {
      expect(transition).toContain(`${property} 300ms ${TAILWIND_CURVE}`);
    }
    expect(transition.split(TAILWIND_CURVE).length - 1).toBe(COLOUR_PROPERTIES.length);
  });

  it('slides the translate for the length and on the curve the widget sets from the constants of floatingLayout.ts', () => {
    const transition = declarations(body).find((line) => line.startsWith('transition:')) ?? '';
    expect(transition).toContain('translate var(--vn-tab-slide-ms) var(--vn-tab-slide-ease)');
    expect(transition).not.toContain('--ease-out');
  });
});

describe('the slide of a moved tab', () => {
  it('keeps the curve it had on main, from the one constant', () => {
    const layout = readFileSync(resolve(__dirname, '../lib/floatingLayout.ts'), 'utf8');
    const placement = readFileSync(resolve(__dirname, '../components/useTabPlacement.ts'), 'utf8');
    expect(layout).toContain("export const TAB_SLIDE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'");
    expect(placement).toContain('TAB_SLIDE_EASE');
    expect(placement).not.toContain('--ease-out');
  });
});
