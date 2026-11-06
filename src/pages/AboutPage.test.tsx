import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aboutCopy } from '../data/aboutCopy';
import { processSteps } from '../data/process';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { findAccentElements } from '../test/accent';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../test/scroll';
import AboutPage from './AboutPage';

const METHOD_HEADING = 'Do primeiro papo ao fluxo rodando';

describe('AboutPage', () => {
  let scrollIntoView: ReturnType<typeof stubScrollIntoViewEverywhere>;

  beforeEach(() => {
    stubMatchMedia();
    // jsdom has no scrollIntoView. It is put back to nothing after every test, so a failing one cannot leak it.
    scrollIntoView = stubScrollIntoViewEverywhere();
  });

  afterEach(removeScrollIntoViewStub);

  it('shows the method section, id metodo, where the old process section was', () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });

    const method = screen.getByRole('region', { name: METHOD_HEADING });

    expect(method).toHaveAttribute('id', 'metodo');
    expect(method.tagName).toBe('SECTION');
    expect(container.querySelectorAll('#metodo')).toHaveLength(1);
    expect(
      within(method)
        .getAllByRole('heading', { level: 3 })
        .map((title) => title.textContent),
    ).toEqual(processSteps.map((step) => step.title));
  });

  it('leaves no markup of the old process section behind', () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });

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

  it('does not scroll anywhere when the address has no hash', () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('has one h1, "Sobre mim", and it is the first heading of the page', () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });

    const titles = screen.getAllByRole('heading', { level: 1 });

    expect(titles.map((title) => title.textContent)).toEqual(['Sobre mim']);
    expect(container.querySelector('h1, h2, h3')).toBe(titles[0]);
  });

  it('puts the sections in order: the founder, the company, the specialties, the method, the tools and the closing band', () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });

    const titles = screen.getAllByRole('heading', { level: 1 }).concat(screen.getAllByRole('heading', { level: 2 }));
    const order = titles.map((title) => title.textContent);

    expect(order).toEqual([
      'Sobre mim',
      'A VN One',
      'Minhas Especialidades',
      METHOD_HEADING,
      aboutCopy.tools.heading,
      aboutCopy.cta.heading,
    ]);
  });

  it('closes with a call to action that links to /contato, and a WhatsApp button next to it', () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });

    expect(screen.getByRole('link', { name: aboutCopy.cta.label })).toHaveAttribute('href', '/contato');
    expect(screen.getByRole('link', { name: 'Falar no WhatsApp' }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/5581984451243\?text=/,
    );
  });

  it('keeps the closing text readable on black: light gray, never a mid gray', () => {
    renderWithProviders(<AboutPage />, { route: '/sobre' });

    const line = screen.getByText(aboutCopy.cta.body);

    expect(line.className).not.toMatch(/zinc|gray-mid/);
    expect(line).toHaveClass('text-vn-gray-light');
  });

  it('never jumps a heading level on the way down: h1, then h2, then h3 (axe heading-order)', () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });

    const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((heading) =>
      Number(heading.tagName[1]),
    );

    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, index) => {
      expect(level - levels[index], `heading ${index + 2} of ${levels.join(',')}`).toBeLessThanOrEqual(1);
    });
  });

  it('has no italic, no dark: variant, no zinc and no "chatbot" anywhere on the page', () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });

    expect(container.innerHTML).not.toMatch(/italic|dark:|zinc/);
    expect(document.body.textContent).not.toMatch(/chat[\s-]?bot/i);
  });

  it('has no more than one accent element in a section, in any attribute (background, text, border, fill): the cursor of the closing band is the only one', () => {
    const { container } = renderWithProviders(<AboutPage />, { route: '/sobre' });

    for (const section of container.querySelectorAll<HTMLElement>('section')) {
      expect(findAccentElements(section).length, section.getAttribute('aria-labelledby') ?? '').toBeLessThanOrEqual(1);
    }
    const accents = findAccentElements(container);

    expect(accents).toHaveLength(1);
    expect(accents[0].closest('section')).toHaveAttribute('data-tone', 'black');
  });
});
