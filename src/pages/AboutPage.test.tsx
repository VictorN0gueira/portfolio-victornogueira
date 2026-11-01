import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { processSteps } from '../data/process';
import { WARM_UP_HOOK_TIMEOUT_MS, preloadAboutSections, warmUpRender } from '../test/lazyPages';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../test/scroll';
import AboutPage from './AboutPage';

const METHOD_HEADING = 'Do primeiro papo ao fluxo rodando';

describe('AboutPage', () => {
  let scrollIntoView: ReturnType<typeof stubScrollIntoViewEverywhere>;

  beforeAll(async () => {
    await preloadAboutSections();
    await warmUpRender(<AboutPage />, () => expect(document.getElementById('metodo')).not.toBeNull());
  }, WARM_UP_HOOK_TIMEOUT_MS);

  beforeEach(() => {
    stubMatchMedia();
    // jsdom has no scrollIntoView. It is put back to nothing after every test, so a failing one cannot leak it.
    scrollIntoView = stubScrollIntoViewEverywhere();
  });

  afterEach(removeScrollIntoViewStub);

  it('shows the method section, id metodo, where the old process section was', async () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });

    const method = await screen.findByRole('region', { name: METHOD_HEADING });

    expect(method).toHaveAttribute('id', 'metodo');
    expect(method.tagName).toBe('SECTION');
    expect(container.querySelectorAll('#metodo')).toHaveLength(1);
    expect(within(method).getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual(
      processSteps.map((step) => step.title),
    );
  });

  it('leaves no markup of the old process section behind', async () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });
    await screen.findByRole('region', { name: METHOD_HEADING });

    expect(container.querySelector('#processo')).toBeNull();
    expect(screen.queryByText('Metodologia')).toBeNull();
    expect(screen.queryByText('Como eu trabalho')).toBeNull();
    expect(screen.queryByText(/máquinas de eficiência/)).toBeNull();
  });

  it('scrolls to the method section when the address carries #metodo, since the browser cannot find an anchor of a page that renders later', async () => {
    renderWithProviders(<AboutPage />, { route: '/sobre#metodo' });

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('metodo'));
  });

  it('does not scroll anywhere when the address has no hash', async () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    await screen.findByRole('region', { name: METHOD_HEADING });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('has one h1, the Sobre mim heading, and the other sections stay below it', async () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    await screen.findByRole('region', { name: METHOD_HEADING });

    const titles = screen.getAllByRole('heading', { level: 1 });
    expect(titles.map((title) => title.textContent)).toEqual(['Sobre mim']);
    expect(titles[0]).toHaveClass('text-4xl', 'md:text-6xl');
  });

  it('keeps the rest of the page: the closing call to action still links to /contato', async () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    await screen.findByRole('region', { name: METHOD_HEADING });

    expect(screen.getByRole('link', { name: /Vamos conversar/ })).toHaveAttribute('href', '/contato');
  });
});
