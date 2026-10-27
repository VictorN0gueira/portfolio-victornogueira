import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { integrations } from '../../data/integrations';
import { stats } from '../../data/stats';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { IntegrationsMarquee } from './IntegrationsMarquee';
import { StatementStats } from './StatementStats';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const MARQUEE_NAME = 'Integrações';

/** Every element of the subtree that names the accent in a utility class or an inline style. */
function findAccentElements(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll('*')).filter((element) => {
    const className = element.getAttribute('class') ?? '';
    const style = (element.getAttribute('style') ?? '').toLowerCase();
    return /(^|[\s:])(bg|text|border|ring|fill|stroke|outline|from|via|to|shadow|decoration|accent)-vn-accent/.test(className) || style.includes('00e5a0') || style.includes('vn-accent');
  });
}

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

  it('gives the marquee a block parent, so the frame can fill a definite width', () => {
    renderWithProviders(<IntegrationsMarquee />);
    const parent = screen.getByRole('region', { name: MARQUEE_NAME }).parentElement as HTMLElement;

    for (const shrinkToFit of ['inline-block', 'inline-flex', 'inline-grid', 'w-fit', 'flex', 'grid', 'absolute']) {
      expect(parent).not.toHaveClass(shrinkToFit);
    }
  });
});

describe('IntegrationsMarquee without motion', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders a single copy of each label when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderWithProviders(<IntegrationsMarquee />);

    expect(screen.getByRole('region', { name: MARQUEE_NAME })).toHaveClass('flex-wrap');
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
    expect(headings[0]).toHaveTextContent('O trabalho repetitivo vai para os fluxos. A equipe fica com o resto.');
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

    expect(screen.getByText('resultado')).toBeInTheDocument();
    expect(screen.getByText('Números dos projetos que a gente já entregou.')).toBeInTheDocument();
  });

  it('is named by its heading', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getByRole('region', { name: /O trabalho repetitivo vai para os fluxos/ })).toBeInTheDocument();
  });

  it('lays the cards out in 1 column, 2 from sm and 4 from lg', () => {
    renderWithProviders(<StatementStats />);
    const grid = screen.getByText('500h+').closest('[class*="grid-cols-1"]');

    expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    expect(grid?.children).toHaveLength(stats.length);
  });

  it('leaves an empty illustration slot for the illustration phase', () => {
    const { container } = renderWithProviders(<StatementStats />);
    const slots = container.querySelectorAll('[data-slot="illustration"]');

    expect(slots).toHaveLength(1);
    expect(slots[0]).toBeEmptyDOMElement();
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

  it('keeps the final value in the DOM for screen readers while the digits count', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getByText('500h+')).toHaveClass('sr-only');
    expect(screen.getByText('85%')).toHaveClass('sr-only');
  });

  it('still has exactly one h2', () => {
    renderWithProviders(<StatementStats />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });
});
