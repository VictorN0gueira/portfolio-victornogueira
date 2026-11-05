import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';
import { useAccessibility } from '../contexts/useAccessibility';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import NotFound from './NotFound';

const TITLE = 'Página não encontrada';
const SCRAMBLE_START_MS = 400;
const SCRAMBLE_TOTAL_MS = 4000;

/** What the eye reads in the h1: the scrambled title. The accessible name is a separate, steady text. */
function shownTitle(): string {
  return screen.getByRole('heading', { level: 1 }).querySelector('[data-title-display]')?.textContent ?? '';
}

describe('NotFound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('ends on the real title: no letter stays scrambled once the effect is over', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS + SCRAMBLE_TOTAL_MS);
    });

    expect(shownTitle()).toBe(TITLE);
  });

  it('shows the real title at once, with no scramble, when the visitor asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderWithProviders(<NotFound />);

    expect(shownTitle()).toBe(TITLE);
  });

  it('names the page for assistive technology with the real title, also in the middle of the scramble', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);
    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(shownTitle()).not.toBe(TITLE);
    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
  });

  it('has one heading, the h1', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('offers the way back to the home page, as a link with a hidden arrow', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    const link = screen.getByRole('link', { name: 'Voltar ao início' });
    expect(link).toHaveAttribute('href', '/');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('says what happened in the draft sentence', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    expect(
      screen.getByText('A página que você procura não existe ou foi movida para outro endereço.'),
    ).toBeInTheDocument();
  });

  it('keeps the real title, with no scramble, when the widget turned animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderWithProviders(<NotFound />);

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS + 100);
    });

    expect(shownTitle()).toBe(TITLE);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders where matchMedia does not exist, with the title ending on the real text', () => {
    vi.stubGlobal('matchMedia', undefined);
    renderWithProviders(<NotFound />);

    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS + SCRAMBLE_TOTAL_MS);
    });

    expect(shownTitle()).toBe(TITLE);
    vi.unstubAllGlobals();
  });

  it('signs the page like the footer: the current year and VN One', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    expect(screen.getByText(`© ${new Date().getFullYear()} VN One`)).toBeInTheDocument();
    expect(screen.queryByText(/Victor Nogueira/)).toBeNull();
  });

  it('stops the scramble and shows the real title when animations are paused while it is running', () => {
    stubMatchMedia();
    function PauseButton() {
      const { toggle } = useAccessibility();
      return (
        <button type="button" onClick={() => toggle('noAnimations')}>
          Pausar animações
        </button>
      );
    }
    renderWithProviders(
      <>
        <NotFound />
        <PauseButton />
      </>,
    );
    // Two acts: the interval of the scramble only starts after the render that the first timer causes.
    act(() => {
      vi.advanceTimersByTime(SCRAMBLE_START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shownTitle()).not.toBe(TITLE);

    fireEvent.click(screen.getByRole('button', { name: 'Pausar animações' }));

    expect(shownTitle()).toBe(TITLE);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(shownTitle()).toBe(TITLE);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('NotFound in the system', () => {
  it('is a black section of the full dynamic height, named by its h1, with the dark grid and the chrome 404', () => {
    stubMatchMedia();
    const { container } = renderWithProviders(<NotFound />);
    const section = container.querySelector('section');
    const heading = screen.getByRole('heading', { level: 1 });

    expect(section).toHaveAttribute('data-tone', 'black');
    expect(section).toHaveClass('min-h-dvh');
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(container.querySelector('.vn-scan-grid--dark')).not.toBeNull();
    expect(container.querySelector('.vn-chrome-text')?.textContent).toBe('404');
  });

  it('uses the palette only: no zinc, no emerald, no blur, no gradient, no italic, no tiny text', () => {
    stubMatchMedia();
    const { container } = renderWithProviders(<NotFound />);

    expect(container.innerHTML).not.toMatch(
      /zinc|emerald|purple|cyan|blur|gradient|italic|text-\[10px\]|text-white\/|\bdark:/,
    );
  });

  it('keeps its small gray lines readable on the black, with the light gray token', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    for (const line of [screen.getByText(/não existe ou foi movida/), screen.getByText(/VN One$/)]) {
      expect(line.className).toContain('text-vn-gray-light');
    }
  });

  it('has a single accent element: the cursor after the title', () => {
    stubMatchMedia();
    const { container } = renderWithProviders(<NotFound />);
    const accents = container.querySelectorAll(
      '[class*="bg-vn-accent"], [class*="text-vn-accent"], [class*="border-vn-accent"]',
    );

    expect(accents).toHaveLength(1);
    expect(accents[0]).toHaveClass('vn-cursor');
  });
});
