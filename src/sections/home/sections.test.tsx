import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { integrations } from '../../data/integrations';
import { stats } from '../../data/stats';
import { findAccentElements } from '../../test/accent';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { IntegrationsMarquee } from './IntegrationsMarquee';
import { StatementStats } from './StatementStats';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const MARQUEE_NAME = 'Integrações';

// A box that takes its width from its content cannot hold the Marquee frame, which has no width of its own.
const SHRINK_TO_FIT_CLASSES = ['inline-block', 'inline-flex', 'inline-grid', 'w-fit', 'w-min', 'w-max', 'absolute', 'fixed', 'flex', 'grid'];

const isInsideHiddenCopy = (element: Element): boolean => element.closest('[aria-hidden="true"]') !== null;

describe('IntegrationsMarquee with motion allowed', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('is a region named Integrações that holds the Notion item', () => {
    renderWithProviders(<IntegrationsMarquee />);

    const region = screen.getByRole('region', { name: MARQUEE_NAME });

    expect(within(region).getAllByText('Notion').length).toBeGreaterThan(0);
  });

  it('shows the kicker and the line above the marquee', () => {
    renderWithProviders(<IntegrationsMarquee />);

    expect(screen.getByText('integrações')).toBeInTheDocument();
    expect(screen.getByText('Conectamos o que você já usa')).toBeInTheDocument();
  });

  it('renders every integration label from the data file', () => {
    renderWithProviders(<IntegrationsMarquee />);
    const region = screen.getByRole('region', { name: MARQUEE_NAME });

    for (const { label } of integrations) {
      expect(within(region).getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('hides the duplicate copy of every label from assistive tech and leaves one copy exposed', () => {
    renderWithProviders(<IntegrationsMarquee />);

    for (const { label } of integrations) {
      const copies = screen.getAllByText(label);

      expect(copies).toHaveLength(2);
      expect(copies.filter(isInsideHiddenCopy)).toHaveLength(1);
    }
  });

  it('draws every icon decorative, since the label next to it names the item', () => {
    renderWithProviders(<IntegrationsMarquee />);
    const region = screen.getByRole('region', { name: MARQUEE_NAME });
    const icons = region.querySelectorAll('svg');

    expect(icons).toHaveLength(integrations.length * 2);
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });

  it('puts the items in gray dark and turns them ink on hover, with no accent anywhere', () => {
    const { container } = renderWithProviders(<IntegrationsMarquee />);
    const [item] = screen.getAllByText('Notion');
    const itemBox = item.closest('[class*="text-vn-gray-dark"]');

    expect(itemBox).not.toBeNull();
    expect(itemBox).toHaveClass('hover:text-vn-ink');
    expect(findAccentElements(container)).toHaveLength(0);
  });

  it('is a white section with a top and a bottom border', () => {
    const { container } = renderWithProviders(<IntegrationsMarquee />);
    const section = container.querySelector('section') as HTMLElement;

    expect(section).toHaveAttribute('data-tone', 'white');
    expect(section).toHaveClass('border-y', 'border-vn-gray-light');
  });

  it('keeps every ancestor of the marquee, up to the section, free of shrink to fit boxes, so the frame fills a definite width', () => {
    const { container } = renderWithProviders(<IntegrationsMarquee />);
    const section = container.querySelector('section') as HTMLElement;
    const ancestors: HTMLElement[] = [];

    for (let box = screen.getByRole('region', { name: MARQUEE_NAME }).parentElement; box; box = box.parentElement) {
      ancestors.push(box);
      if (box === section) break;
    }

    expect(ancestors.at(-1)).toBe(section);
    expect(ancestors.length).toBeGreaterThan(1);
    for (const ancestor of ancestors) {
      for (const shrinkToFit of SHRINK_TO_FIT_CLASSES) {
        expect(ancestor, `${ancestor.tagName} with ${shrinkToFit}`).not.toHaveClass(shrinkToFit);
      }
    }
  });

  it('tightens the space between items to 1.5rem on small screens and 2.5rem from sm up, through the Marquee gap variable', () => {
    renderWithProviders(<IntegrationsMarquee />);

    expect(screen.getByRole('region', { name: MARQUEE_NAME })).toHaveClass(
      '[--vn-marquee-gap:1.5rem]',
      'sm:[--vn-marquee-gap:2.5rem]',
    );
  });
});

describe('IntegrationsMarquee without motion', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders a single copy of each label when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderWithProviders(<IntegrationsMarquee />);

    // The wrapping row takes the same gap variable, so its rows stay short (15 items) on a small screen.
    expect(screen.getByRole('region', { name: MARQUEE_NAME })).toHaveClass(
      'flex-wrap',
      '[--vn-marquee-gap:1.5rem]',
      'sm:[--vn-marquee-gap:2.5rem]',
    );
    expect(screen.getByText('Notion')).toBeInTheDocument();
    for (const { label } of integrations) {
      const copies = screen.getAllByText(label);

      expect(copies).toHaveLength(1);
      expect(isInsideHiddenCopy(copies[0])).toBe(false);
    }
  });

  it('renders a single copy of each label when the accessibility toggle paused animations', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    renderWithProviders(<IntegrationsMarquee />);

    for (const { label } of integrations) {
      expect(screen.getAllByText(label)).toHaveLength(1);
    }
  });
});

describe('StatementStats with motion off', () => {
  beforeEach(() => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
  });

  it('shows the four numbers as plain text', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getByText('500h+')).toBeInTheDocument();
    expect(screen.getByText('100+')).toBeInTheDocument();
    expect(screen.getByText('10+')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('has exactly one h2, the statement', () => {
    renderWithProviders(<StatementStats />);

    const headings = screen.getAllByRole('heading', { level: 2 });

    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(homeCopy.statement.heading);
  });

  it('shows the label and the description of every stat', () => {
    renderWithProviders(<StatementStats />);

    for (const { label, description } of stats) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    }
  });

  it('shows the kicker and the sub line', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getByText(homeCopy.statement.kicker)).toBeInTheDocument();
    expect(screen.getByText(homeCopy.statement.sub)).toBeInTheDocument();
  });

  it('is named by its heading', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getByRole('region', { name: homeCopy.statement.heading })).toBeInTheDocument();
  });

  it('lays the cards out in 1 column, 2 from sm and 4 from lg', () => {
    renderWithProviders(<StatementStats />);
    const grid = screen.getByText('500h+').closest('[class*="grid-cols-1"]');

    expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    expect(grid?.children).toHaveLength(stats.length);
  });

  it('reveals the cards through a group of their own, nested in the one of the header, so they reveal when the grid is in view', () => {
    const { container } = renderWithProviders(<StatementStats />);
    const grid = screen.getByText('500h+').closest('[class*="grid-cols-1"]') as HTMLElement;
    const headingGroup = screen.getByRole('heading', { level: 2 }).closest('[data-reveal-group]') as HTMLElement;

    expect(container.querySelectorAll('[data-reveal-group]')).toHaveLength(2);
    expect(grid).toHaveAttribute('data-reveal-group');
    expect(headingGroup).not.toBe(grid);
    expect(headingGroup).toContainElement(grid);
    for (const card of Array.from(grid.children)) {
      expect(card).toHaveAttribute('data-reveal-item');
      expect(card.parentElement?.closest('[data-reveal-group]')).toBe(grid);
    }
  });

  it('leaves an empty illustration slot, exactly <div data-slot="illustration" />, for the illustration phase', () => {
    const { container } = renderWithProviders(<StatementStats />);
    const slots = container.querySelectorAll('[data-slot="illustration"]');

    expect(slots).toHaveLength(1);
    expect(slots[0]).toBeEmptyDOMElement();
    expect(slots[0].tagName).toBe('DIV');
    expect(slots[0].getAttributeNames()).toEqual(['data-slot']);
  });

  it('keeps the accent out of a section on a light background', () => {
    const { container } = renderWithProviders(<StatementStats />);

    expect(findAccentElements(container)).toHaveLength(0);
  });
});

describe('StatementStats with motion allowed', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('keeps the final value of every stat in the DOM for screen readers while the digits count', () => {
    renderWithProviders(<StatementStats />);

    expect(stats).toHaveLength(4);
    for (const { value } of stats) {
      expect(screen.getByText(value)).toHaveClass('sr-only');
    }
  });

  it('keeps the tight line height on the counting number, which twMerge drops if it comes before the font size', () => {
    renderWithProviders(<StatementStats />);

    for (const { value } of stats) {
      const root = screen.getByText(value).parentElement as HTMLElement;

      expect(root).toHaveClass('leading-none', 'tabular-nums');
    }
  });

  it('keeps the accent out of the section while it counts too', () => {
    const { container } = renderWithProviders(<StatementStats />);

    expect(findAccentElements(container)).toHaveLength(0);
  });

  it('still has exactly one h2', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });
});
