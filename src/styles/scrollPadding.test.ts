// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blockBody } from '../test/css';

// WCAG 2.4.11 (X:M-6): on a phone the accessibility tab floats on the right edge, 96px over the bottom margin of the
// window, and the focused control must be brought clear of it. The browser scrolls a focused element into the part of
// the window left by `scroll-padding`, so the padding at the bottom has to reach the top of the tab (e2e/floating-focus
// proves it in a real browser at 280 to 412px). From sm up, and on a phone held sideways, the tab is centred on the
// edge and the plain 5rem for the WhatsApp button is enough.

const indexCss = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
const widgetSource = readFileSync(resolve(__dirname, '../components/AccessibilityWidget.tsx'), 'utf8');

describe('scroll padding at the bottom of the window', () => {
  it('keeps 5rem as the base, for the WhatsApp button', () => {
    expect(blockBody(indexCss, '@layer base', 'scroll-padding-bottom')).toContain('scroll-padding-bottom: 5rem');
  });

  it('clears the accessibility tab on a phone held upright (under sm, taller than 30rem)', () => {
    const phone = blockBody(indexCss, '@media (width < 40rem) and (min-height: 30rem)');

    // The tab sits 96px over max(16px, the bottom inset) and is 2.75rem (size-11) tall; a few px of air on top of it.
    expect(phone).toContain('scroll-padding-bottom: calc(max(16px, env(safe-area-inset-bottom)) + 96px + 2.75rem + 8px)');
  });

  it('matches how the widget is placed: 96px over the safe area, size-11, centred from sm up and under 30rem', () => {
    expect(widgetSource).toContain('bottom-[calc(max(16px,env(safe-area-inset-bottom))+96px)]');
    expect(widgetSource).toContain('size-11');
    expect(widgetSource).toContain('sm:top-1/2');
    expect(widgetSource).toContain('[@media(max-height:30rem)]:top-1/2');
  });

  // The tab can be moved (src/components/useTabPlacement.ts sets the band on the root): the padding follows it.
  it('follows a tab the visitor moved, at the bottom or the top edge, without touching the default rules', () => {
    expect(blockBody(indexCss, "html[data-vn-tab-band='bottom']")).toContain('scroll-padding-bottom: max(var(--vn-tab-pad), 5rem)');
    expect(blockBody(indexCss, "html[data-vn-tab-band='top']")).toContain('scroll-padding-top: max(var(--vn-tab-pad), 96px, calc(env(safe-area-inset-top) + 84px))');
  });
});
