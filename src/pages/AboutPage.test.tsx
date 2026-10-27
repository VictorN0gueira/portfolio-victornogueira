import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { processSteps } from '../data/process';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AboutPage from './AboutPage';

const METHOD_HEADING = 'Do primeiro papo ao fluxo rodando';

describe('AboutPage', () => {
  it('shows the method section, id metodo, where the old process section was', async () => {
    stubMatchMedia();
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
    stubMatchMedia();
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });
    await screen.findByRole('region', { name: METHOD_HEADING });

    expect(container.querySelector('#processo')).toBeNull();
    expect(screen.queryByText('Metodologia')).toBeNull();
    expect(screen.queryByText('Como eu trabalho')).toBeNull();
    expect(screen.queryByText(/máquinas de eficiência/)).toBeNull();
  });

  it('scrolls to the method section when the address carries #metodo, since the browser cannot find an anchor of a page that renders later', async () => {
    stubMatchMedia();
    const scrollIntoView = vi.fn();
    // jsdom has no scrollIntoView.
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
    try {
      renderWithProviders(<AboutPage />, { route: '/sobre#metodo' });

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('metodo'));
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  it('does not scroll anywhere when the address has no hash', async () => {
    stubMatchMedia();
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
    try {
      renderWithProviders(<AboutPage />, { route: '/sobre' });
      await screen.findByRole('region', { name: METHOD_HEADING });

      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  it('keeps the rest of the page: the closing call to action still links to /contato', async () => {
    stubMatchMedia();
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    await screen.findByRole('region', { name: METHOD_HEADING });

    expect(screen.getByRole('link', { name: /Vamos conversar/ })).toHaveAttribute('href', '/contato');
  });
});
