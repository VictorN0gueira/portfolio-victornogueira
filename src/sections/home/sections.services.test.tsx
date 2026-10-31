import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { type Service } from '../../data/services';
import { findAccentElements } from '../../test/accent';
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { featuredServices } from './featuredServices';
import { ServicesCards } from './ServicesCards';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const HEADING = 'Três jeitos de tirar trabalho manual da sua frente';
const LINK_NAME = 'Ver todos os serviços';
const CARD_NAMES = ['Automação Essencial', 'Agente de IA Sob Medida', 'Landing Page ou Site'];

const getCards = (): HTMLElement[] => screen.getAllByRole('article');

/** The ways the visitor can reach the section. None of them may change what the cards show or whether they take focus. */
const MODES = {
  mouse: () => stubMatchMedia({ [FINE_POINTER_QUERY]: true }),
  touch: () => stubMatchMedia(),
  mouseWithReducedMotion: () => stubMatchMedia({ [FINE_POINTER_QUERY]: true, [REDUCED_MOTION_QUERY]: true }),
  mouseWithAnimationsOff: () => {
    stubMatchMedia({ [FINE_POINTER_QUERY]: true });
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
  },
} as const;

afterEach(() => {
  localStorage.clear();
});

describe('ServicesCards content', () => {
  it('renders three articles named after the services: Automação Essencial, Agente de IA Sob Medida and the first of Desenvolvimento Web', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    const cards = getCards();

    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.getAttribute('aria-labelledby'))).not.toContain(null);
    for (const name of CARD_NAMES) {
      expect(screen.getByRole('article', { name })).toBeInTheDocument();
    }
    expect(cards.map((card) => within(card).getByRole('heading', { level: 3 }).textContent)).toEqual(CARD_NAMES);
  });

  it('shows the kicker and the heading exactly as approved', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    expect(screen.getByText('o que a gente faz')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(HEADING);
    expect(homeCopy.services.kicker).toBe('o que a gente faz');
    expect(homeCopy.services.heading).toBe(HEADING);
    expect(homeCopy.services.link).toBe(LINK_NAME);
  });

  it('has exactly one h2, and the section is named by it', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('region', { name: HEADING })).toBeInTheDocument();
  });

  it('shows the category, the description and the term of every card, the category and the term in mono', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    featuredServices.forEach((service: Service, position) => {
      const card = getCards()[position];
      const category = within(card).getByText(service.categoria);
      const term = within(card).getByText(service.prazo);

      expect(within(card).getByText(service.descricao)).toBeInTheDocument();
      expect(category.closest('p')).toHaveClass('font-mono', 'uppercase');
      expect(term).toHaveClass('font-mono');
      expect(card).toHaveTextContent(`${homeCopy.services.term}: ${service.prazo}`);
    });
  });

  it('keeps the card names as h3 under the single h2, each one naming its article', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    for (const card of getCards()) {
      const name = within(card).getByRole('heading', { level: 3 });

      expect(card.getAttribute('aria-labelledby')).toBe(name.id);
    }
  });

  it('keeps the accent out of the section, with a mouse or without', () => {
    MODES.mouse();
    const { container } = renderWithProviders(<ServicesCards />);

    expect(findAccentElements(container)).toHaveLength(0);
  });

  it('is a cream section, so the white cards stand out of it', () => {
    MODES.touch();
    const { container } = renderWithProviders(<ServicesCards />);

    expect(container.querySelector('section')).toHaveAttribute('data-tone', 'cream');
  });
});

describe('ServicesCards link', () => {
  it('goes to /servicos, named Ver todos os serviços, through the router link of a button', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    const link = screen.getByRole('link', { name: LINK_NAME });

    expect(link).toHaveAttribute('href', '/servicos');
    expect(link.tagName).toBe('A');
    expect(link).toHaveClass('rounded-full', 'inline-flex');
  });

  it('draws the arrow of the link as a decorative icon, not as a character in the text', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    const link = screen.getByRole('link', { name: LINK_NAME });
    const icon = link.querySelector('svg');

    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(link.textContent).toBe(LINK_NAME);
  });

  it('is an ink pill with no accent, 56px tall at least, so well over the 44px of a touch target', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    const link = screen.getByRole('link', { name: LINK_NAME });

    expect(link).toHaveClass('bg-vn-ink', 'min-h-14');
    expect(findAccentElements(link.parentElement as HTMLElement)).toHaveLength(0);
  });
});

describe('ServicesCards layout', () => {
  it('has 1 column, 2 from md and 3 from lg, and the third card spans the two columns of md so none is left alone', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);
    const grid = getCards()[0].closest('[class*="grid-cols-1"]') as HTMLElement;

    expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    expect(grid.children).toHaveLength(3);
    expect(grid.children[2]).toHaveClass('md:col-span-2', 'lg:col-span-1');
    expect(grid.children[0]).not.toHaveClass('md:col-span-2');
  });

  it('has no look on the article: the radius, border and background belong to the SpotlightCard inside it', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    for (const card of getCards()) {
      const surface = card.querySelector('.vn-spotlight') as HTMLElement;

      expect(card.className).not.toMatch(/rounded|border|bg-|outline|ring|shadow/);
      expect(surface).toHaveClass('rounded-[clamp(20px,3vw,28px)]', 'border', 'bg-vn-white');
    }
  });

  it('lets a card shrink below the width of its longest word instead of widening the page', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    for (const card of getCards()) {
      expect(card).toHaveClass('min-w-0');
    }
  });

  it('observes the header and the cards through one RevealGroup each, never per item', () => {
    MODES.touch();
    const { container } = renderWithProviders(<ServicesCards />);
    const groups = container.querySelectorAll('[data-reveal-group]');
    const grid = getCards()[0].closest('[class*="grid-cols-1"]') as HTMLElement;

    expect(groups).toHaveLength(2);
    expect(groups[1]).toContainElement(grid);
    expect(groups[1]).toContainElement(screen.getByRole('link', { name: LINK_NAME }));
    expect(groups[0]).toContainElement(screen.getByRole('heading', { level: 2 }));
    expect(groups[0]).not.toContainElement(grid);
  });
});

// Anything that would dim, hide or push a list off the screen of the visitor.
const HIDING_CLASSES = /(^|\s)(hidden|invisible|sr-only|opacity-\S+|translate-\S+|scale-\S+|h-0)(\s|$)/;

describe('ServicesCards includes list', () => {
  for (const [mode, setUp] of Object.entries(MODES)) {
    it(`is a real list that is always in the DOM and exposed to assistive tech, with ${mode}`, () => {
      setUp();
      renderWithProviders(<ServicesCards />);

      featuredServices.forEach((service, position) => {
        const card = getCards()[position];
        // getByRole leaves out anything that is aria-hidden, display none or visibility hidden.
        const list = within(card).getByRole('list');
        const items = within(list).getAllByRole('listitem');

        expect(list.tagName).toBe('UL');
        // Tailwind preflight removes the markers, and Safari then drops the list semantics unless the role is explicit.
        expect(list).toHaveAttribute('role', 'list');
        expect(list).toHaveClass('vn-card-includes');
        expect(items.map((item) => item.textContent)).toEqual(service.inclui);
      });
    });

    it(`never hides, dims or moves the list with hidden, aria-hidden, inert, display, visibility, opacity or a class, with ${mode}`, () => {
      setUp();
      renderWithProviders(<ServicesCards />);

      for (const card of getCards()) {
        const list = within(card).getByRole('list');

        // Up to and including the article, and no further: its parent is the RevealItem, which carries motion's inline opacity.
        for (let box: HTMLElement | null = list; box && box !== card.parentElement; box = box.parentElement) {
          expect(box).not.toHaveAttribute('hidden');
          expect(box).not.toHaveAttribute('aria-hidden');
          expect(box).not.toHaveAttribute('inert');
          expect(box.style.display).not.toBe('none');
          expect(box.style.visibility).not.toBe('hidden');
          expect(box.style.opacity).toBe('');
          expect(box.className, box.tagName).not.toMatch(HIDING_CLASSES);
        }
      }
    });
  }

  it('draws the check of every item as a decorative svg icon', () => {
    MODES.touch();
    renderWithProviders(<ServicesCards />);

    for (const card of getCards()) {
      const items = within(within(card).getByRole('list')).getAllByRole('listitem');

      for (const item of items) {
        const icon = item.querySelector('svg');

        expect(icon).not.toBeNull();
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      }
    }
  });
});

describe('ServicesCards hover settle', () => {
  it('keeps the list inside the SpotlightCard that tokens.css keys the settle on, in the article', () => {
    MODES.mouse();
    renderWithProviders(<ServicesCards />);

    for (const card of getCards()) {
      const spotlight = within(card).getByRole('list').closest('.vn-spotlight');

      expect(spotlight).not.toBeNull();
      expect(card).toContainElement(spotlight as HTMLElement);
    }
  });

  it('leaves 24px (pt-6) above the term, so the 8px the list rests low never reaches it', () => {
    MODES.mouse();
    renderWithProviders(<ServicesCards />);

    featuredServices.forEach((service, position) => {
      const term = within(getCards()[position]).getByText(service.prazo);

      expect(term).toHaveClass('pt-6', 'mt-auto');
    });
  });
});

describe('ServicesCards cards are plain, not interactive', () => {
  for (const [mode, setUp] of Object.entries(MODES)) {
    it(`has no tab stop, no hover mark and no focus ring on any article, with ${mode}`, () => {
      setUp();
      const { container } = renderWithProviders(<ServicesCards />);

      for (const card of getCards()) {
        expect(card).not.toHaveAttribute('tabindex');
        expect(card).not.toHaveAttribute('data-hover-reveal');
        expect(card.className).not.toMatch(/focus/);
      }
      expect(container.querySelectorAll('[data-hover-reveal]')).toHaveLength(0);
      // The link is the only thing in the section that takes the focus.
      expect(container.querySelectorAll('[tabindex], a[href], button')).toHaveLength(1);
    });
  }
});
