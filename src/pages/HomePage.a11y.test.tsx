import { waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { WARM_UP_HOOK_TIMEOUT_MS, preloadHomeSections, warmUpRender } from '../test/lazyPages';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import HomePage from './HomePage';

// The strip of integrations, the statement and the seven named sections.
const H2_COUNT = 9;
const AXE_TIMEOUT_MS = 60_000;

expectNoConsoleOutput();

// Automated accessibility audit of the whole mounted home, with every lazy section in and reduced motion on (so nothing is
// mid animation). jsdom has no layout and no painted colors, so the contrast rule cannot run here: contrast is audited
// in the browser by e2e/home.axe.spec.ts. Everything else (names, roles, ARIA, landmarks, headings, labels) runs here.
describe('HomePage accessibility (axe)', () => {
  beforeAll(async () => {
    await preloadHomeSections();
    await warmUpRender(<HomePage />, () => expect(document.querySelectorAll('h2')).toHaveLength(H2_COUNT));
  }, WARM_UP_HOOK_TIMEOUT_MS);

  beforeEach(() => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    rejectUnexpectedFetch();
  });

  it('has no axe violation in the mounted home', { timeout: AXE_TIMEOUT_MS }, async () => {
    const { container } = renderWithProviders(<HomePage />);
    await waitFor(() => expect(document.querySelectorAll('h2')).toHaveLength(H2_COUNT));

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });

    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
