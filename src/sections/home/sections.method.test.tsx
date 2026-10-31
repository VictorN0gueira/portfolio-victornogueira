import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { homeCopy } from '../../data/homeCopy';
import { processSteps } from '../../data/process';
import { findAccentElements } from '../../test/accent';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { MethodSteps } from './MethodSteps';

// The real Reveal, wrapped in spies, so the props the section gives it can be read while it still works.
vi.mock('../../components/ui/Reveal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../components/ui/Reveal')>();
  return { ...actual, RevealGroup: vi.fn(actual.RevealGroup), RevealItem: vi.fn(actual.RevealItem) };
});

const A11Y_STORAGE_KEY = 'a11y-preferences';
const HEADING = 'Do primeiro papo ao fluxo rodando';
const SUB = 'Você conhece o negócio e a gente cuida do método e da execução.';
const STAIRCASE = ['lg:mt-24', 'lg:mt-16', 'lg:mt-8', 'lg:mt-0'];
const STAGGER_S = 0.12;
// A top margin that is not the staircase: one that applies below lg would bend the 2x2 and the column.
const MARGIN_BELOW_LG = /(^|\s)(mt-|sm:mt-|md:mt-)/;

const getSteps = (): HTMLElement[] => screen.getAllByRole('listitem');
const getCard = (step: HTMLElement): HTMLElement => step.firstElementChild as HTMLElement;

beforeEach(() => {
  vi.mocked(RevealGroup).mockClear();
  vi.mocked(RevealItem).mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('MethodSteps content', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('is the section with the id metodo, so /#metodo and Ver como funciona land on it', () => {
    const { container } = renderWithProviders(<MethodSteps />);
    const section = container.querySelector('section') as HTMLElement;

    expect(section).toHaveAttribute('id', 'metodo');
    expect(document.getElementById('metodo')).toBe(section);
  });

  it('takes another id when asked, and keeps metodo as the default', () => {
    const { container } = renderWithProviders(<MethodSteps id="como-funciona" />);

    expect(container.querySelector('section')).toHaveAttribute('id', 'como-funciona');
    expect(document.getElementById('metodo')).toBeNull();
  });

  it('shows the numbers 01 to 04', () => {
    renderWithProviders(<MethodSteps />);

    for (const number of ['01', '02', '03', '04']) {
      expect(screen.getByText(number)).toBeInTheDocument();
    }
  });

  it('shows the kicker, the heading and the sub line exactly as approved', () => {
    renderWithProviders(<MethodSteps />);

    expect(screen.getByText(homeCopy.method.kicker)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(HEADING);
    expect(screen.getByText(SUB)).toBeInTheDocument();
    expect(homeCopy.method).toEqual({ kicker: 'como funciona', heading: HEADING, sub: SUB });
  });

  it('has exactly one h2, and the section is named by it', () => {
    renderWithProviders(<MethodSteps />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('region', { name: HEADING })).toBeInTheDocument();
  });

  it('shows the title as an h3, the duration in mono and the description of every step of process.ts', () => {
    renderWithProviders(<MethodSteps />);

    processSteps.forEach((step, position) => {
      const card = getCard(getSteps()[position]);

      expect(within(card).getByRole('heading', { level: 3, name: step.title })).toBeInTheDocument();
      expect(within(card).getByText(step.duration)).toHaveClass('font-mono');
      expect(within(card).getByText(step.description)).toBeInTheDocument();
    });
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('keeps the accent out of the section, with motion on and off', () => {
    const { container, unmount } = renderWithProviders(<MethodSteps />);

    expect(findAccentElements(container)).toHaveLength(0);
    unmount();
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const quiet = renderWithProviders(<MethodSteps />);

    expect(findAccentElements(quiet.container)).toHaveLength(0);
  });

  it('is a white section, so the cream cards stand out of it', () => {
    const { container } = renderWithProviders(<MethodSteps />);

    expect(container.querySelector('section')).toHaveAttribute('data-tone', 'white');
  });
});

describe('MethodSteps order for assistive tech', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('is an ordered list of four steps, in the order of process.ts, announced as a list even where list-style none drops it', () => {
    renderWithProviders(<MethodSteps />);

    const list = screen.getByRole('list');

    expect(list.tagName).toBe('OL');
    expect(list).toHaveAttribute('role', 'list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(getSteps().map((step) => within(step).getByRole('heading', { level: 3 }).textContent)).toEqual(
      processSteps.map((step) => step.title),
    );
  });

  it('hides the big numerals from assistive tech, because the list already says "1 of 4" and the number would be read twice', () => {
    renderWithProviders(<MethodSteps />);

    for (const number of ['01', '02', '03', '04']) {
      expect(screen.getByText(number)).toHaveAttribute('aria-hidden', 'true');
    }
    // Nothing is lost: the numeral is the only thing hidden, the title of every step stays in the accessibility tree.
    for (const step of getSteps()) {
      expect(within(step).getByRole('heading', { level: 3 })).toBeInTheDocument();
    }
  });

  it('puts the numeral first in every card, in the order 01 to 04', () => {
    renderWithProviders(<MethodSteps />);

    const numerals = getSteps().map((step) => getCard(step).firstElementChild?.textContent);

    expect(numerals).toEqual(['01', '02', '03', '04']);
  });
});

describe('MethodSteps layout', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('has 1 column, a 2 by 2 grid from md and 4 columns from lg', () => {
    renderWithProviders(<MethodSteps />);
    const list = screen.getByRole('list');

    expect(list).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    expect(list.children).toHaveLength(4);
  });

  it('climbs a staircase from lg: lg:mt-24, lg:mt-16, lg:mt-8 and lg:mt-0, one step per card', () => {
    renderWithProviders(<MethodSteps />);

    getSteps().forEach((step, position) => {
      expect(step).toHaveClass(STAIRCASE[position]);
    });
  });

  it('has no step of the staircase below lg, so md is a plain 2 by 2 and a phone a plain column', () => {
    renderWithProviders(<MethodSteps />);

    for (const step of getSteps()) {
      expect(step.className).not.toMatch(MARGIN_BELOW_LG);
    }
  });

  it('lets a card shrink below the width of its longest word, and fills the height of its row so the rules share a baseline', () => {
    renderWithProviders(<MethodSteps />);

    for (const step of getSteps()) {
      expect(step).toHaveClass('min-w-0', 'flex');
      expect(getCard(step)).toHaveClass('flex-1', 'min-w-0');
    }
  });

  it('sets the numeral in Space Grotesk bold at clamp(3rem, 2rem + 3vw, 4.5rem)', () => {
    renderWithProviders(<MethodSteps />);

    for (const number of ['01', '02', '03', '04']) {
      expect(screen.getByText(number)).toHaveClass('font-display', 'font-bold', 'text-[length:clamp(3rem,2rem+3vw,4.5rem)]');
    }
  });

  it('sizes every step title from the width of its own card, capped at 1.75rem, so a long word fits without breaking in the middle', () => {
    renderWithProviders(<MethodSteps />);

    for (const step of getSteps()) {
      const title = within(step).getByRole('heading', { level: 3 });

      // cqi is relative to the nearest container: the wrapper takes the full width of the card content.
      expect(title).toHaveClass('text-[length:clamp(1.125rem,15cqi,1.75rem)]');
      // twMerge keeps one font size: the one of the size m heading is replaced, not stacked.
      expect(title.className).not.toContain('clamp(1.5rem,1.2rem+1vw,1.75rem)');
      expect(title.parentElement).toHaveClass('@container');
      expect(title.parentElement?.parentElement).toBe(getCard(step));
    }
  });

  it('closes every card with a decorative 3px rule in ink, as its last child', () => {
    renderWithProviders(<MethodSteps />);

    for (const step of getSteps()) {
      const card = getCard(step);
      const rule = card.lastElementChild as HTMLElement;

      expect(rule).toHaveClass('bg-vn-ink', 'h-[3px]');
      expect(rule).toHaveAttribute('aria-hidden', 'true');
      expect(rule).toBeEmptyDOMElement();
    }
  });
});

describe('MethodSteps reveal', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('observes the header and the cards through one RevealGroup each, never per item', () => {
    const { container } = renderWithProviders(<MethodSteps />);
    const groups = container.querySelectorAll('[data-reveal-group]');
    const list = screen.getByRole('list');

    expect(groups).toHaveLength(2);
    expect(groups[1]).toContainElement(list);
    expect(groups[0]).toContainElement(screen.getByRole('heading', { level: 2 }));
    expect(groups[0]).not.toContainElement(list);
    expect(groups[1].querySelectorAll('[data-reveal-item]')).toHaveLength(4);
  });

  it('staggers the cards by 0.12 seconds, and no group has another stagger', () => {
    renderWithProviders(<MethodSteps />);

    const staggers = vi.mocked(RevealGroup).mock.calls.map(([props]) => props.stagger);

    expect(staggers).toContain(STAGGER_S);
    expect(staggers.filter((stagger) => stagger !== undefined)).toEqual(staggers.filter((stagger) => stagger === STAGGER_S));
  });

  it('rises every card with the up variant, and no item slides sideways or zooms', () => {
    renderWithProviders(<MethodSteps />);

    const variants = vi.mocked(RevealItem).mock.calls.map(([props]) => props.variant);

    expect(variants.filter((variant) => variant === 'up').length).toBeGreaterThanOrEqual(4);
    expect(variants.every((variant) => variant === undefined || variant === 'up')).toBe(true);
  });

  it('hides the cards until their group is in view while motion is allowed', () => {
    renderWithProviders(<MethodSteps />);

    for (const step of getSteps()) {
      expect(getCard(step).style.opacity).toBe('0');
    }
  });

  it('shows every card at once, with no hidden style, when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderWithProviders(<MethodSteps />);

    for (const step of getSteps()) {
      expect(getCard(step).style.opacity).toBe('');
    }
  });

  it('shows every card at once when the accessibility toggle paused animations', () => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderWithProviders(<MethodSteps />);

    for (const step of getSteps()) {
      expect(getCard(step).style.opacity).toBe('');
    }
  });
});
