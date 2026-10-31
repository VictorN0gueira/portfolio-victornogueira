import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import NotFound from './NotFound';

const TITLE = 'Página não encontrada';
const SCRAMBLE_TOTAL_MS = 4400;

describe('NotFound title under StrictMode (effects run twice)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('still ends on the exact title, with no trailing scrambled character', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />, { strict: true });

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_TOTAL_MS);
    });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE);
  });
});
