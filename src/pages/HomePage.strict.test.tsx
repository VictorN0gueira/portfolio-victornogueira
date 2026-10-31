import { screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { WARM_UP_HOOK_TIMEOUT_MS, preloadHomeSections, warmUpRender } from '../test/lazyPages';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import HomePage from './HomePage';

// The sections after the hero: the strip of integrations, the statement and the seven named ones.
const H2_COUNT = 9;

expectNoConsoleOutput();

// main.tsx mounts the app in StrictMode, which the other home suites do not: every effect of the page (the hash scroll, the
// observers, the counts, the rotating tabs) runs twice here, and a cleanup that forgets something shows as a duplicate,
// a console error or a missing section.
describe('HomePage in StrictMode', () => {
  beforeAll(async () => {
    await preloadHomeSections();
    await warmUpRender(<HomePage />, () => expect(document.querySelectorAll('h2')).toHaveLength(H2_COUNT));
  }, WARM_UP_HOOK_TIMEOUT_MS);

  beforeEach(() => {
    stubMatchMedia();
    rejectUnexpectedFetch();
  });

  it('renders every section once, with no console output, after the effects ran twice', async () => {
    renderWithProviders(<HomePage />, { strict: true });

    await waitFor(() => expect(document.querySelectorAll('h2')).toHaveLength(H2_COUNT));

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { name: homeCopy.finalCta.heading })).toHaveLength(1);
    expect(document.querySelectorAll('#contato')).toHaveLength(1);
  });
});
