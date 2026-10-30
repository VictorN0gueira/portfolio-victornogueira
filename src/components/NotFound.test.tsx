import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import NotFound from './NotFound';

const TITLE = 'Página não encontrada';
const SCRAMBLE_START_MS = 400;
const SCRAMBLE_TOTAL_MS = 4000;

describe('NotFound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ends on the real title: no letter stays scrambled once the effect is over', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS + SCRAMBLE_TOTAL_MS);
    });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE);
  });

  it('shows the real title at once, with no scramble, when the visitor asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderWithProviders(<NotFound />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE);
  });

  it('names the page for assistive technology whatever the scramble shows', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
  });

  it('offers the way back to the home page', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
  });
});
