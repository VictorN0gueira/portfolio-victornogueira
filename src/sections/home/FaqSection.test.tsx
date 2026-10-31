import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { NEW_TAB_HINT } from '../../components/ui/NewTabHint';
import { faqs } from '../../data/faqs';
import { whatsappUrl } from '../../lib/constants';
import { findAccentElements } from '../../test/accent';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { renderWithProviders } from '../../test/render';
import { FaqSection } from './FaqSection';
import { itemOf } from '../../test/revealItem';

const HEADING = 'Perguntas que a gente sempre ouve';
const LINK_NAME = 'Falar no WhatsApp';
const LINK_MESSAGE = 'Olá! Tenho uma dúvida sobre automação.';

expectNoConsoleOutput();

const linkEl = (): HTMLAnchorElement => screen.getByRole('link', { name: LINK_NAME }) as HTMLAnchorElement;

describe('FaqSection copy and structure', () => {
  it('is a white section named by its only h2', () => {
    const { container } = renderWithProviders(<FaqSection />);
    const headings = screen.getAllByRole('heading');

    expect(container.querySelector('section')).toHaveAttribute('data-tone', 'white');
    expect(headings).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(HEADING);
    expect(screen.getByRole('region', { name: HEADING })).toBeInTheDocument();
  });

  it('shows the kicker and the sub line', () => {
    renderWithProviders(<FaqSection />);

    expect(screen.getByText('dúvidas')).toBeInTheDocument();
    expect(screen.getByText('Se a sua não estiver aqui, chama no WhatsApp.')).toBeInTheDocument();
  });

  it('lists every question of the data file with its answer', () => {
    const { container } = renderWithProviders(<FaqSection />);
    const details = [...container.querySelectorAll('details')];

    expect(details).toHaveLength(faqs.length);
    faqs.forEach((faq, index) => {
      expect(details[index].querySelector('summary')).toHaveTextContent(faq.question);
      expect(details[index]).toHaveTextContent(faq.answer);
    });
  });
});

describe('FaqSection WhatsApp link', () => {
  it('tells a screen reader it opens a new tab, without changing its name', () => {
    renderWithProviders(<FaqSection />);

    expect(linkEl()).toHaveAccessibleName(LINK_NAME);
    expect(linkEl()).toHaveAccessibleDescription(NEW_TAB_HINT);
  });
});

describe('FaqSection accordion semantics', () => {
  it('uses native disclosure: the first item starts open, the others closed, all sharing one name', () => {
    const { container } = renderWithProviders(<FaqSection />);
    const details = [...container.querySelectorAll('details')];
    const names = new Set(details.map((item) => item.getAttribute('name')));

    expect(details.map((item) => item.open)).toEqual(faqs.map((_, index) => index === 0));
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it('opens an item when its summary is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<FaqSection />);

    await user.click(screen.getByText(faqs[2].question));

    expect([...container.querySelectorAll('details')][2]).toHaveAttribute('open');
  });

  it('keeps the plus icons out of the accessibility tree', () => {
    const { container } = renderWithProviders(<FaqSection />);

    for (const icon of container.querySelectorAll('summary svg')) {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('FaqSection WhatsApp link', () => {
  it('opens a chat with the official number and the FAQ message, in a new tab', () => {
    renderWithProviders(<FaqSection />);

    expect(linkEl()).toHaveAttribute('href', whatsappUrl(LINK_MESSAGE));
    expect(linkEl()).toHaveAttribute('target', '_blank');
    expect(linkEl().getAttribute('rel')?.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
  });

  it('is a secondary pill on the light surface with a 44px target', () => {
    renderWithProviders(<FaqSection />);

    expect(linkEl()).toHaveClass('rounded-full', 'border', 'bg-transparent', 'text-vn-ink', 'min-h-14');
    expect(linkEl()).not.toHaveClass('bg-vn-accent');
  });

  it('keeps its size, leading and color classes after the class merge', () => {
    renderWithProviders(<FaqSection />);

    expect(linkEl()).toHaveClass('text-base', 'leading-tight', 'text-vn-ink');
  });
});

describe('FaqSection layout', () => {
  it('puts the title, the sub line and the button on the left and the accordion on the right from lg', () => {
    const { container } = renderWithProviders(<FaqSection />);
    const heading = screen.getByRole('heading', { level: 2 });
    const grid = itemOf(heading).parentElement as HTMLElement;
    const accordionItem = itemOf(container.querySelector('details') as HTMLElement);

    expect(grid.className).toMatch(/\bgrid-cols-1\b/);
    expect(grid.className).toMatch(/\blg:grid-cols-/);
    expect(itemOf(linkEl())).toBe(itemOf(heading));
    expect(accordionItem).not.toBe(itemOf(heading));
    expect(accordionItem.parentElement).toBe(grid);
    expect(heading.compareDocumentPosition(accordionItem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lets both columns shrink so a long question never widens a 280px page', () => {
    const { container } = renderWithProviders(<FaqSection />);

    expect(itemOf(screen.getByRole('heading', { level: 2 }))).toHaveClass('min-w-0');
    expect(itemOf(container.querySelector('details') as HTMLElement)).toHaveClass('min-w-0');
  });

  it('reveals through one group for its one container, never one per item', () => {
    const { container } = renderWithProviders(<FaqSection />);

    expect(container.querySelectorAll('[data-reveal-group]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-reveal-item] [data-reveal-group]')).toHaveLength(0);
  });
});

describe('FaqSection palette', () => {
  it('keeps the accent out of a section on a light background', () => {
    const { container } = renderWithProviders(<FaqSection />);

    expect(findAccentElements(container)).toHaveLength(0);
  });
});
