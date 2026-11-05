import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import NotFound from './NotFound';

const TITLE = 'Página não encontrada';
const SCRAMBLE_START_MS = 400;
const SCRAMBLE_TOTAL_MS = 4000;

const hasFrame = (): boolean => screen.getByRole('heading', { level: 1 }).querySelector('[data-scramble]') !== null;

describe('NotFound title under StrictMode (effects run twice)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scrambles, and still ends on the exact title with no frame left', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />, { strict: true });

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(hasFrame()).toBe(true);

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_TOTAL_MS);
    });

    expect(hasFrame()).toBe(false);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE);
    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
  });
});
