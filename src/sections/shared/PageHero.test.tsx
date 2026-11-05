import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findAccentElements } from '../../test/accent';
import { renderWithProviders } from '../../test/render';
import { PageHero } from './PageHero';

const sectionOf = (container: HTMLElement): HTMLElement => container.querySelector('section') as HTMLElement;

describe('PageHero', () => {
  it('is a section named by the one h1 with the title', () => {
    const { container } = renderWithProviders(<PageHero kicker="O que a gente entrega" title="Serviços" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Serviços' });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(heading.id).not.toBe('');
    expect(sectionOf(container)).toHaveAttribute('aria-labelledby', heading.id);
    expect(screen.getByRole('region', { name: 'Serviços' })).toBe(sectionOf(container));
  });

  it('is the flat cream band with the border, not the inset card of the home', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="t" />);

    expect(sectionOf(container)).toHaveAttribute('data-tone', 'cream');
    expect(sectionOf(container)).toHaveClass('border-b', 'border-vn-gray-light');
    expect(sectionOf(container).className).not.toContain('rounded');
  });

  it('shows the kicker, the lead and the children', () => {
    renderWithProviders(
      <PageHero kicker="O que a gente entrega" title="Serviços" lead="Escopo claro e prazo definido.">
        <a href="/contato">ação</a>
      </PageHero>,
    );

    expect(screen.getByText('O que a gente entrega')).toBeInTheDocument();
    expect(screen.getByText('Escopo claro e prazo definido.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ação' })).toBeInTheDocument();
  });

  it('keeps a hyphenated word of the lead whole: "e-mail" sits in a no-wrap span and the text is unchanged', () => {
    const lead = 'O roteiro chega por e-mail, dia a dia.';
    renderWithProviders(<PageHero kicker="k" title="t" lead={lead} />);

    const leadParagraph = screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === lead);

    expect([...leadParagraph.querySelectorAll('span')].map((span) => [span.textContent, span.className])).toEqual([
      ['e-mail,', 'whitespace-nowrap'],
    ]);
  });

  it('draws no lead when none is given', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="t" />);

    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('puts the aside in a second column only when there is one', () => {
    const { container, rerender } = renderWithProviders(<PageHero kicker="k" title="t" />);
    expect(container.querySelector('[data-hero-aside]')).toBeNull();
    expect(container.querySelector('[data-hero-columns]')?.className).not.toContain('lg:grid-cols');

    rerender(<PageHero kicker="k" title="t" aside={<span>foto</span>} />);
    expect(container.querySelector('[data-hero-aside]')).toHaveTextContent('foto');
    expect(container.querySelector('[data-hero-columns]')?.className).toContain(
      'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
    );
  });

  it('draws the cursor after the last word in ink, hidden from assistive tech, and never uses the accent', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="Quem faz" hasCursor />);
    const cursor = container.querySelector('.vn-cursor') as HTMLElement;

    expect(cursor).toHaveAttribute('aria-hidden', 'true');
    expect(cursor).toHaveClass('bg-vn-ink');
    expect(cursor.closest('h1')).not.toBeNull();
    expect(findAccentElements(sectionOf(container))).toHaveLength(0);
    expect(sectionOf(container).innerHTML).not.toContain('vn-accent');
  });

  it('draws no cursor by default', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="t" />);

    expect(container.querySelector('.vn-cursor')).toBeNull();
  });

  it('keeps the last word and the cursor together, so the cursor never wraps alone', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="Quem faz" hasCursor />);
    const wrapper = container.querySelector('h1 span.whitespace-nowrap') as HTMLElement;

    expect(wrapper).toHaveTextContent('faz');
    expect(wrapper.querySelector('.vn-cursor')).not.toBeNull();
  });

  it('starts below the fixed header with the two custom properties, the second for a phone held sideways', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="t" />);
    const top = container.querySelector('[style*="--hero-top"]') as HTMLElement;

    expect(top.style.getPropertyValue('--hero-top')).toContain('env(safe-area-inset-top)');
    expect(top.style.getPropertyValue('--hero-top-landscape')).toContain('env(safe-area-inset-top)');
    expect(top.className).toContain('pt-[var(--hero-top)]');
    expect(top.className).toContain('vn-landscape:pt-[var(--hero-top-landscape)]');
  });

  it('keeps a hyphenated word of the title on one line', () => {
    renderWithProviders(<PageHero kicker="k" title="Link-in-Bio e mais" />);
    const word = screen.getByText('Link-in-Bio');

    expect(word.tagName).toBe('SPAN');
    expect(word).toHaveClass('whitespace-nowrap');
  });

  it('uses the id given to the section', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="t" id="topo" />);

    expect(sectionOf(container)).toHaveAttribute('id', 'topo');
  });

  it('draws the light scan grid behind the content', () => {
    const { container } = renderWithProviders(<PageHero kicker="k" title="t" />);

    expect(container.querySelector('.vn-scan-grid')).not.toBeNull();
    expect(container.querySelector('.vn-scan-grid--dark')).toBeNull();
  });
});
