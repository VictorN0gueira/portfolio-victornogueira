import { screen, within } from '@testing-library/react';
import { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { BlogFilters } from './BlogFilters';

type FiltersProps = Parameters<typeof BlogFilters>[0];

function renderFilters(props: Partial<FiltersProps> = {}) {
  const handlers = {
    onSearchChange: vi.fn(),
    onLangChange: vi.fn(),
    onCatChange: vi.fn(),
    onClear: vi.fn(),
  };
  const view = renderWithProviders(
    <BlogFilters
      searchQuery=""
      langFilter="all"
      catFilter="all"
      resultCount={5}
      hasActiveFilters={false}
      isLoading={false}
      searchRef={createRef<HTMLInputElement>()}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
}

describe('BlogFilters chips', () => {
  it('has a group per row, named, with one chip per option and aria-pressed on the one that is on', () => {
    renderFilters({ langFilter: 'en', catFilter: 'n8n' });

    const languages = within(screen.getByRole('group', { name: 'Filtrar por idioma' }));
    const topics = within(screen.getByRole('group', { name: 'Filtrar por tópico' }));
    expect(languages.getAllByRole('button')).toHaveLength(3);
    expect(topics.getAllByRole('button')).toHaveLength(7);
    expect(languages.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(languages.getByRole('button', { name: 'Todos idiomas' })).toHaveAttribute('aria-pressed', 'false');
    expect(topics.getByRole('button', { name: 'N8N' })).toHaveAttribute('aria-pressed', 'true');
    expect(topics.getByRole('button', { name: 'Todos tópicos' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('tells the page which language or topic was pressed', async () => {
    const user = userEvent.setup();
    const { onLangChange, onCatChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: 'Agentes' }));

    expect(onLangChange).toHaveBeenCalledWith('en');
    expect(onCatChange).toHaveBeenCalledWith('agentes');
  });

  it('keeps the flags out of the name and marks the English chip as English', () => {
    renderFilters();

    expect(screen.getByRole('button', { name: 'Português' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' }).querySelector('[lang="en"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'English' }).querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('makes every chip a plain button with the 44px class (jsdom paints no boxes: e2e measures them) in a row that wraps', () => {
    renderFilters();

    for (const chip of screen.getAllByRole('button')) {
      expect(chip).toHaveAttribute('type', 'button');
    }
    for (const chip of [...within(screen.getByRole('group', { name: 'Filtrar por idioma' })).getAllByRole('button')]) {
      expect(chip).toHaveClass('min-h-11');
    }
    const group = screen.getByRole('group', { name: 'Filtrar por idioma' });
    expect(group).toHaveClass('flex-wrap');
    expect(group.className).not.toMatch(/overflow-x|scrollbar/);
  });

  it('draws the ring of the light surface on every control', () => {
    renderFilters({ searchQuery: 'x', hasActiveFilters: true });

    for (const control of [...screen.getAllByRole('button'), screen.getByRole('textbox', { name: 'Buscar artigos' })]) {
      expect(control.className, control.textContent ?? control.id).toMatch(/vn-focus-ring-ink|outline-vn-ink/);
    }
  });
});

describe('BlogFilters search', () => {
  it('is a labelled search field with a placeholder in the token gray', () => {
    renderFilters();

    const field = screen.getByRole('textbox', { name: 'Buscar artigos' });
    expect(field).toHaveAttribute('id', 'search');
    expect(field).toHaveAttribute('placeholder', 'Buscar artigos...');
    expect(field).toHaveClass('placeholder:text-vn-gray-dark');
    expect(screen.getByRole('search')).toContainElement(field);
  });

  it('tells the page what was typed', async () => {
    const user = userEvent.setup();
    const { onSearchChange } = renderFilters();

    await user.type(screen.getByRole('textbox', { name: 'Buscar artigos' }), 'n');

    expect(onSearchChange).toHaveBeenCalledWith('n');
  });

  it('shows a clear button only when there is a query, a plain button with the 44px class (e2e measures the box)', async () => {
    const user = userEvent.setup();
    const empty = renderFilters();
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).toBeNull();
    empty.unmount();

    const { onSearchChange } = renderFilters({ searchQuery: 'agentes' });
    const clear = screen.getByRole('button', { name: 'Limpar busca' });
    expect(clear).toHaveAttribute('type', 'button');
    expect(clear).toHaveClass('size-11');

    await user.click(clear);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});

describe('BlogFilters count', () => {
  it('has one status region that is in the page before any filter is used, and it is empty then', () => {
    renderFilters();

    const regions = screen.getAllByRole('status');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  it('says how many articles were found, with the word agreeing with the number, in the same region', () => {
    const { rerender } = renderFilters({ hasActiveFilters: true, resultCount: 1 });
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('1 artigo encontrado');

    rerender(
      <BlogFilters
        searchQuery=""
        langFilter="all"
        catFilter="all"
        resultCount={3}
        hasActiveFilters
        isLoading={false}
        searchRef={createRef<HTMLInputElement>()}
        onSearchChange={vi.fn()}
        onLangChange={vi.fn()}
        onCatChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('3 artigos encontrados');
  });

  it('offers Limpar filtros when a filter is on, and it clears them', async () => {
    const user = userEvent.setup();
    const { onClear } = renderFilters({ hasActiveFilters: true });

    const clear = screen.getByRole('button', { name: 'Limpar filtros' });
    expect(clear).toHaveClass('min-h-11');
    await user.click(clear);

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('BlogFilters look', () => {
  it('sits on the white band of the system, with no accent, no zinc and no white opacity', () => {
    const { container } = renderFilters({ hasActiveFilters: true, searchQuery: 'x', langFilter: 'pt' });

    expect(container.querySelector('section')).toHaveAttribute('data-tone', 'white');
    expect(container.innerHTML).not.toMatch(/accent|zinc|purple|cyan|gradient|blur|italic|dark:|white\/|text-\[10px\]/);
  });
});

describe('BlogFilters keeps the focus when a control goes away (WCAG 2.4.3)', () => {
  it('puts the focus on the search field after Limpar busca, which disappears with the query', async () => {
    const user = userEvent.setup();
    renderFilters({ searchQuery: 'agentes' });

    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));

    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toHaveFocus();
  });

  it('asks the page to clear the filters: the page owns the focus after it (BlogPage tests the focus)', async () => {
    const user = userEvent.setup();
    const { onClear } = renderFilters({ hasActiveFilters: true });

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('keeps one Limpar filtros on the screen when nothing matches: the empty block has its own', () => {
    renderFilters({ hasActiveFilters: true, resultCount: 0 });

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('0 artigos encontrados');
  });
});

describe('BlogFilters while the sources answer', () => {
  it('stays in the page with every control disabled and aria-busy, so the band keeps its height and nothing moves', () => {
    renderFilters({ isLoading: true, searchQuery: 'x', hasActiveFilters: true });

    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toBeDisabled();
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Buscar artigos' }).closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('is enabled and not busy as soon as nothing is loading', () => {
    renderFilters({ isLoading: false });

    expect(screen.getByRole('textbox', { name: 'Buscar artigos' }).closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'false',
    );

    expect(screen.getByRole('textbox', { name: 'Buscar artigos' })).toBeEnabled();
    for (const button of screen.getAllByRole('button')) expect(button).toBeEnabled();
  });
});
