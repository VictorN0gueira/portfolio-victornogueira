import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processSteps } from '../data/process';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AboutPage from './AboutPage';

const METHOD_HEADING = 'Do primeiro papo ao fluxo rodando';

describe('AboutPage', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    stubMatchMedia();
    scrollIntoView.mockClear();
    // jsdom has no scrollIntoView. It is put back to nothing after every test, so a failing one cannot leak it.
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  it('has everything above #metodo in its first render, with no lazy skeleton, so the anchor never moves when a chunk arrives', () => {
    // This test has to stay first in the file: React.lazy keeps what it loaded, so after any other render a lazy About
    // would already be resolved here and the test could not tell.
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });
    const method = document.getElementById('metodo') as HTMLElement;
    const about = container.querySelector('#sobre') as HTMLElement;

    // Found at once, with no findBy: a lazy About would still be a skeleton here.
    expect(screen.getByRole('heading', { level: 2, name: 'Sobre mim' })).toBeInTheDocument();
    expect(method.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    // Whatever is still loading (the skills) sits below the method section.
    for (const skeleton of screen.queryAllByText('Carregando...')) {
      expect(method.compareDocumentPosition(skeleton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

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

  it('keeps the rest of the page: the closing call to action still links to /contato', async () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    await screen.findByRole('region', { name: METHOD_HEADING });

    expect(screen.getByRole('link', { name: /Vamos conversar/ })).toHaveAttribute('href', '/contato');
  });
});
