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

const heading = (): HTMLElement => screen.getByRole('heading', { level: 1 });

/** The frame of the scramble the eye sees (drawn by CSS from data-scramble), or null when the real title is on show. */
function drawnFrame(): string | null {
  const words = Array.from(heading().querySelectorAll('[data-scramble]'));
  return words.length === 0 ? null : words.map((word) => word.getAttribute('data-scramble')).join(' ');
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('NotFound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('scrambles in the middle and ends on the real title: no frame stays once the effect is over', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);
    advance(SCRAMBLE_START_MS);
    advance(600);

    expect(drawnFrame()).not.toBeNull();
    expect(drawnFrame()).not.toBe(TITLE);

    advance(SCRAMBLE_TOTAL_MS);

    expect(drawnFrame()).toBeNull();
    expect(heading().textContent).toBe(TITLE);
  });

  it('keeps the real title in the flow, once, whatever the scramble draws: it is the text, the name and the size', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);
    advance(SCRAMBLE_START_MS);

    for (let step = 0; step < 20; step += 1) {
      advance(60);
      expect(heading().textContent).toBe(TITLE);
      expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
    }
    expect(drawnFrame()).not.toBeNull();
  });

  it('hides only the letters under the frame, and shows them again at the end', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);
    advance(SCRAMBLE_START_MS);
    advance(600);
    const letters = Array.from(heading().querySelectorAll('[data-scramble] > span'));

    expect(letters).toHaveLength(3);
    letters.forEach((word) => expect(word).toHaveClass('opacity-0'));

    advance(SCRAMBLE_TOTAL_MS);

    expect(heading().querySelector('[class*="opacity-0"]')).toBeNull();
  });

  it('adds nothing to the page but the title: no second copy, no screen reader only text, no test hook', () => {
    stubMatchMedia();
    const { container } = renderWithProviders(<NotFound />);
    advance(SCRAMBLE_START_MS);
    advance(600);

    expect(heading().querySelector('.sr-only')).toBeNull();
    expect(heading().innerHTML).not.toContain('data-title-display');
    expect(container.textContent?.split(TITLE).length).toBe(2);
    expect(heading().querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(heading().querySelector('[aria-hidden="true"]')).toHaveClass('vn-cursor');
  });

  it('shows the real title at once, with no frame, when the visitor asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderWithProviders(<NotFound />);
    advance(SCRAMBLE_START_MS + 1000);

    expect(drawnFrame()).toBeNull();
    expect(heading().textContent).toBe(TITLE);
  });

  it('has one heading, the h1', () => {
    stubMatchMedia();
    renderWithProviders(<NotFound />);

    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(heading()).toBeInTheDocument();
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

  it('keeps the real title, with no frame and no timer, when the widget turned animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderWithProviders(<NotFound />);
    advance(SCRAMBLE_START_MS + 100);

    expect(drawnFrame()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders where matchMedia does not exist, scrambling and then ending on the real title', () => {
    vi.stubGlobal('matchMedia', undefined);
    renderWithProviders(<NotFound />);
    advance(SCRAMBLE_START_MS);
    advance(300);
    expect(drawnFrame()).not.toBeNull();

    advance(SCRAMBLE_TOTAL_MS);

    expect(drawnFrame()).toBeNull();
    expect(heading().textContent).toBe(TITLE);
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
    // Two steps: the interval of the scramble only starts after the render that the first timer causes.
    advance(SCRAMBLE_START_MS);
    advance(1000);
    expect(drawnFrame()).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pausar animações' }));

    expect(drawnFrame()).toBeNull();
    advance(500);
    expect(drawnFrame()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('NotFound in the system', () => {
  it('is a black section of the full dynamic height, named by its h1, with the dark grid and the chrome 404', () => {
    stubMatchMedia();
    const { container } = renderWithProviders(<NotFound />);
    const section = container.querySelector('section');

    expect(section).toHaveAttribute('data-tone', 'black');
    expect(section).toHaveClass('min-h-dvh');
    expect(section).toHaveAttribute('aria-labelledby', heading().id);
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
