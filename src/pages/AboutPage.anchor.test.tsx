import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AboutPage from './AboutPage';

// One test in this file, on purpose. React.lazy keeps what it loaded inside the module instance, and Vitest gives every
// file its own modules, so here the first render of the page is always a cold one in any order of the tests. In
// AboutPage.test.tsx a lazy About would already be resolved by the time this ran, and the test could not tell.
describe('AboutPage anchor', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('has everything above #metodo in its first render, with no lazy skeleton, so the anchor never moves when a chunk arrives', () => {
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
});
