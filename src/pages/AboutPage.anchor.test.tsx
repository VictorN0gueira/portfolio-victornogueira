import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { FOUNDER_PHOTO } from '../sections/about/founderPhotoSource';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import AboutPage from './AboutPage';

// What keeps /sobre#metodo where the hash scroll put it: nothing above the method may change its height after the first
// render. The sections are plain imports, so none of them waits for a chunk (src/test/lazyPages.test.tsx checks that the
// page has no import()); what is left that could grow is an image that loads late.
describe('AboutPage anchor', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('has the founder, the company and the specialties in the first render, in the document before #metodo', () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    const method = document.getElementById('metodo') as HTMLElement;

    // Found at once, with no findBy.
    for (const heading of [
      screen.getByRole('heading', { level: 1, name: 'Sobre mim' }),
      screen.getByRole('heading', { level: 2, name: 'A VN One' }),
      screen.getByRole('heading', { level: 2, name: 'Minhas Especialidades' }),
    ]) {
      expect(method.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    }
  });

  it('reserves the box of every image above #metodo (width and height), so a photo that arrives late cannot push the anchor', () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });
    const method = document.getElementById('metodo') as HTMLElement;
    const images = Array.from(document.querySelectorAll('img')).filter(
      (image) => method.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_PRECEDING,
    );

    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image).toHaveAttribute('width', String(FOUNDER_PHOTO.width));
      expect(image).toHaveAttribute('height', String(FOUNDER_PHOTO.height));
    }
  });
});
