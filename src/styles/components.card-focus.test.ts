// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { blockBody } from '../test/css';
import { componentsCss } from '../test/styles';

// A card whose link is its title (the blog cards): the ring is the card's, drawn through :has, so the rules written for
// a focused element itself never reach it.
describe('components.css card focus', () => {
  const card = blockBody(componentsCss, '@utility vn-focus-ring-ink-card');

  it('draws the ink ring on the card while a link inside it has the keyboard focus', () => {
    const ring = blockBody(card, '&:has(a:focus-visible)');

    expect(ring).toContain('outline: 2px solid var(--color-vn-ink)');
    expect(ring).toContain('outline-offset: 2px');
  });

  it('underlines the title too while the card wears the ring: the focus stays findable at 400% zoom, in a short window and in forced colors', () => {
    const title = blockBody(card, '&:has(a:focus-visible) h3');

    expect(title).toContain('text-decoration: underline');
    expect(title).toContain('text-decoration-thickness: 2px');
    expect(title).toContain('text-underline-offset: 0.2em');
  });

  it('never underlines the title for a mouse click: the underline sits behind the same keyboard focus as the ring', () => {
    expect(card).not.toMatch(/&:hover|&:focus(?!-visible)|:focus-within/);
    expect(card.match(/text-decoration:/g)).toHaveLength(1);
    expect(card.match(/&:has\(a:focus-visible\)/g)).toHaveLength(2);
  });

  it('makes the stretched link draw no ring of its own where :has works, and keeps it where it does not', () => {
    const link = blockBody(componentsCss, '@utility vn-stretched-link');

    expect(blockBody(link, '&:focus-visible')).toContain('outline: 2px solid var(--color-vn-ink)');
    expect(blockBody(blockBody(link, '@supports selector(:has(*))'), '&:focus-visible')).toContain('outline: none');
  });

  it('thickens the ring of the card with more contrast: the variant rule for a focused element never matches the card', () => {
    const contrast = blockBody(componentsCss, '@variant vn-contrast');

    expect(blockBody(contrast, ':focus-visible')).toContain('outline-width: 3px !important');
    expect(blockBody(contrast, '.vn-focus-ring-ink-card:has(a:focus-visible)')).toContain(
      'outline-width: 3px !important',
    );
  });
});
