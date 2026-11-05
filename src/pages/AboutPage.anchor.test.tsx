import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AboutPage from './AboutPage';

describe('AboutPage anchor', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('has everything above #metodo in its first render, with no lazy skeleton, so the anchor never moves when a chunk arrives', () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    const method = document.getElementById('metodo') as HTMLElement;

    // Found at once, with no findBy: nothing above the method waits for a chunk.
    const intro = screen.getByRole('heading', { level: 1, name: 'Sobre mim' });
    expect(method.compareDocumentPosition(intro) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(screen.queryAllByText('Carregando...')).toHaveLength(0);
  });
});
