import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NEW_TAB_HINT } from '../../components/ui/NewTabHint';
import { homeCopy } from '../../data/homeCopy';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { FinalCta } from './FinalCta';

// jsdom has no layout: the order of the layers and the mask of the scan line are pinned here, and
// e2e/visual-defects.spec.ts compares pixels of the content box with and without the line (V:D7).
function renderCta() {
  stubMatchMedia();
  const { container } = renderWithProviders(<FinalCta />);
  return container.querySelector('section') as HTMLElement;
}

describe('FinalCta scan layer', () => {
  it('draws the grid first and behind the content, in a section that is its own stacking context', () => {
    const section = renderCta();

    const grid = section.firstElementChild as HTMLElement;
    expect(grid).toHaveClass('vn-scan-grid', '-z-10', 'pointer-events-none');
    expect(grid).toHaveAttribute('aria-hidden', 'true');
    expect(section).toHaveClass('isolate');
    expect(grid.nextElementSibling).toContainElement(screen.getByRole('heading', { level: 2 }));
  });

  it('keeps the scan line out of the column of the heading and the form: it only sweeps the margins', () => {
    const section = renderCta();

    const line = section.querySelector('.vn-scan-line') as HTMLElement;
    expect(line.getAttribute('style')).toContain('mask-image');
    expect(line.getAttribute('style')).toContain('1216px');
  });
});

describe('FinalCta WhatsApp link', () => {
  it('opens a new tab and says so to a screen reader, keeping its name', () => {
    renderCta();

    const link = screen.getByRole('link', { name: homeCopy.finalCta.cta });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
  });
});
