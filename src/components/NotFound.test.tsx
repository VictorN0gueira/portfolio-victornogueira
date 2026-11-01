import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';
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

  it('keeps the real title, with no scramble, when the widget turned animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderWithProviders(<NotFound />);

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS + 100);
    });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE);
    expect(vi.getTimerCount()).toBe(0);
    localStorage.clear();
  });

  it('renders where matchMedia does not exist, with the title ending on the real text', () => {
    vi.stubGlobal('matchMedia', undefined);
    renderWithProviders(<NotFound />);

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS + SCRAMBLE_TOTAL_MS);
    });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITLE);
    vi.unstubAllGlobals();
  });

  it('signs the page like the footer: the current year and VN One', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    expect(screen.getByText(`© ${new Date().getFullYear()} VN One`)).toBeInTheDocument();
    expect(screen.queryByText(/Victor Nogueira/)).toBeNull();
  });

  it('keeps its small gray lines readable on the black (no zinc 500 or 700)', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    for (const line of [screen.getByText(/não existe ou foi movida/), screen.getByText(/VN One$/)]) {
      expect(line.className).not.toMatch(/zinc-[567]00/);
    }
  });
});
