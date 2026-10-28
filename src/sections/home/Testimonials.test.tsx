import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { testimonials } from '../../data/testimonials';
import { partners } from '../../data/partners';
import { findAccentElements } from '../../test/accent';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { renderWithProviders } from '../../test/render';
import { excerptOf } from './excerpt';
import { Testimonials } from './Testimonials';

const OPEN_NAME = /ler depoimento completo/i;
const STAGGERED_POSITIONS = [1, 4];

// Pristine output: no act warning, no Radix missing title or description warning.
expectNoConsoleOutput();

const cardOf = (name: string): HTMLElement => screen.getByRole('article', { name });
const itemOf = (card: HTMLElement): HTMLElement => card.closest('[data-reveal-item]') as HTMLElement;

describe('Testimonials section', () => {
  it('is the section with id clientes by default', () => {
    const { container } = renderWithProviders(<Testimonials />);

    expect(container.querySelector('section')).toHaveAttribute('id', 'clientes');
  });

  it('takes another id', () => {
    const { container } = renderWithProviders(<Testimonials id="depoimentos" />);

    expect(container.querySelector('section')).toHaveAttribute('id', 'depoimentos');
  });

  it('is a cream section named by its only h2', () => {
    const { container } = renderWithProviders(<Testimonials />);
    const headings = screen.getAllByRole('heading', { level: 2 });

    expect(container.querySelector('section')).toHaveAttribute('data-tone', 'cream');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Quem já automatizou com a gente');
    expect(screen.getByRole('region', { name: 'Quem já automatizou com a gente' })).toBeInTheDocument();
  });

  it('adds no other heading: the cards and the client list are named without one', () => {
    renderWithProviders(<Testimonials />);

    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it('shows the kicker clientes', () => {
    renderWithProviders(<Testimonials />);

    expect(screen.getByText('clientes')).toBeInTheDocument();
  });

  it('ends with the client grid, after every card', () => {
    const { container } = renderWithProviders(<Testimonials />);
    const section = container.querySelector('section') as HTMLElement;
    const list = within(section).getByRole('list', { name: 'quem confia' });
    const lastCard = screen.getAllByRole('article').at(-1) as HTMLElement;

    expect(within(list).getAllByRole('listitem')).toHaveLength(partners.length);
    expect(lastCard.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the accent out of a section on a light background', () => {
    const { container } = renderWithProviders(<Testimonials />);

    expect(findAccentElements(container)).toHaveLength(0);
  });
});

describe('Testimonials cards', () => {
  it('renders one article per testimonial, each named by its author', () => {
    renderWithProviders(<Testimonials />);

    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(testimonials).toHaveLength(6);
    for (const { name } of testimonials) expect(cardOf(name)).toBeInTheDocument();
  });

  it('still shows the draft testimonials (ids 5 and 6) like every other one', () => {
    renderWithProviders(<Testimonials />);
    const drafts = testimonials.filter((item) => item.isDraft);

    expect(drafts.map((item) => item.id)).toEqual([5, 6]);
    for (const draft of drafts) {
      expect(within(cardOf(draft.name)).getByText(excerptOf(draft.text))).toBeInTheDocument();
    }
  });

  it('shows the excerpt in a blockquote: the first 140 characters cut at the last word, or the whole text when short', () => {
    renderWithProviders(<Testimonials />);

    for (const { name, text } of testimonials) {
      const quote = cardOf(name).querySelector('blockquote') as HTMLElement;

      expect(quote).toHaveTextContent(excerptOf(text));
      expect(quote.textContent).toBe(excerptOf(text));
    }
    const cut = testimonials.filter((item) => excerptOf(item.text) !== item.text);
    const whole = testimonials.filter((item) => excerptOf(item.text) === item.text);
    expect(cut.length).toBeGreaterThan(0);
    expect(whole.length).toBeGreaterThan(0);
    for (const item of cut) expect(excerptOf(item.text).endsWith('…')).toBe(true);
    for (const item of whole) expect(cardOf(item.name).textContent).not.toContain('…');
  });

  it('shows the author name, the role and the company', () => {
    renderWithProviders(<Testimonials />);

    for (const { name, role, company } of testimonials) {
      const card = cardOf(name);

      expect(within(card).getByText(name)).toBeInTheDocument();
      expect(card.textContent).toContain(role);
      expect(card.textContent).toContain(company);
    }
  });

  it('does not repeat the name as the company when they are the same', () => {
    renderWithProviders(<Testimonials />);
    const solo = testimonials.filter((item) => item.company === item.name);

    expect(solo.length).toBeGreaterThan(0);
    for (const { name } of solo) expect(within(cardOf(name)).getAllByText(name)).toHaveLength(1);
  });

  it('draws the logo as a decorative image, since the company name is next to it, sized, lazy and async', () => {
    renderWithProviders(<Testimonials />);

    for (const { name, logo, logoFit } of testimonials) {
      const img = cardOf(name).querySelector('img') as HTMLImageElement;

      expect(img).toHaveAttribute('src', logo);
      expect(img).toHaveAttribute('alt', '');
      expect(img).toHaveAttribute('width');
      expect(img).toHaveAttribute('height');
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
      expect(img).toHaveClass(logoFit === 'cover' ? 'object-cover' : 'object-contain');
    }
  });

  it('tones the card logo like the grid logos: gray at rest, colored on hover and focus within the card', () => {
    renderWithProviders(<Testimonials />);

    for (const { name } of testimonials) {
      const card = cardOf(name);

      expect(card).toHaveClass('vn-logo-host');
      expect(card.querySelector('img')).toHaveClass('vn-logo-tone');
    }
  });

  it('swaps a logo that fails to load for the initials, hidden from assistive tech', () => {
    renderWithProviders(<Testimonials />);
    const card = cardOf('Adailton Amancio');

    fireEvent.error(card.querySelector('img') as HTMLImageElement);

    const fallback = card.querySelector('[data-logo-fallback]') as HTMLElement;
    expect(card.querySelector('img')).toBeNull();
    expect(fallback).toHaveTextContent('CP');
    expect(fallback).toHaveAttribute('aria-hidden', 'true');
  });

  it('has a button on every card that reads Ler depoimento completo and names its author for assistive tech', () => {
    renderWithProviders(<Testimonials />);
    const buttons = screen.getAllByRole('button', { name: OPEN_NAME });

    expect(buttons).toHaveLength(6);
    buttons.forEach((button, position) => {
      const { name } = testimonials[position];

      expect(button).toHaveTextContent(/^Ler depoimento completo$/);
      expect(button).toHaveAttribute('aria-label', `Ler depoimento completo de ${name}`);
      expect(within(cardOf(name)).getByRole('button')).toBe(button);
      expect(button).toHaveClass('min-h-11');
    });
  });

  it('has no star, no carousel control and no autoplay', () => {
    renderWithProviders(<Testimonials />);

    expect(screen.queryByRole('button', { name: /anterior|próximo/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('breaks long names and keeps the cards from widening a 280px page', () => {
    renderWithProviders(<Testimonials />);

    for (const { name } of testimonials) {
      const card = cardOf(name);

      expect(card).toHaveClass('min-w-0');
      expect(within(card).getByText(name)).toHaveClass('break-words');
    }
  });
});

describe('Testimonials layout', () => {
  it('lays the cards out in 1 column, 2 from md and 3 from lg', () => {
    renderWithProviders(<Testimonials />);
    const grid = itemOf(cardOf(testimonials[0].name)).parentElement as HTMLElement;

    expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    expect(grid.children).toHaveLength(testimonials.length);
  });

  it('staggers the heights only from lg: the 2nd and the 5th card have lg:mt-16 and nothing else has a top margin', () => {
    renderWithProviders(<Testimonials />);

    testimonials.forEach(({ name }, position) => {
      const item = itemOf(cardOf(name));
      const margins = item.className.split(/\s+/).filter((token) => /(^|:)mt-/.test(token));

      expect(margins, name).toEqual(STAGGERED_POSITIONS.includes(position) ? ['lg:mt-16'] : []);
    });
  });

  it('reveals through three groups, one per container (header, cards, client grid), never one per item', () => {
    const { container } = renderWithProviders(<Testimonials />);
    const groups = Array.from(container.querySelectorAll('[data-reveal-group]'));
    const cards = screen.getAllByRole('article');

    expect(groups).toHaveLength(3);
    for (const card of cards) expect(itemOf(card).parentElement?.closest('[data-reveal-group]')).toBe(groups[1]);
    for (const item of container.querySelectorAll('[data-reveal-item]')) {
      expect(item.closest('[data-reveal-group]')).not.toBeNull();
    }
    // Groups are never created inside an item.
    expect(container.querySelectorAll('[data-reveal-item] [data-reveal-group]')).toHaveLength(0);
  });
});
