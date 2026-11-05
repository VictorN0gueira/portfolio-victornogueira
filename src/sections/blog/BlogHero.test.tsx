import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { BlogHero } from './BlogHero';

function renderHero(props: Partial<Parameters<typeof BlogHero>[0]> = {}) {
  const onRefresh = vi.fn();
  const view = renderWithProviders(
    <BlogHero isLoading={false} status="Lista carregada agora" onRefresh={onRefresh} {...props} />,
  );
  return { ...view, onRefresh };
}

describe('BlogHero', () => {
  it('is the PageHero of the blog: one h1 with the title, the kicker and the lead, named by its section', () => {
    const { container } = renderHero();

    const title = screen.getByRole('heading', { level: 1, name: 'Leituras sobre IA e automação' });
    expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', title.id);
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText(/A gente junta artigos sobre inteligência artificial e automação/)).toBeInTheDocument();
  });

  it('has no gradient text, no italic and no second color: the title is plain ink on cream', () => {
    const { container } = renderHero();

    expect(container.innerHTML).not.toMatch(/gradient|bg-clip-text|italic|text-transparent|zinc|accent|dark:/);
  });

  it('has an Atualizar button that asks for a refresh', async () => {
    const user = userEvent.setup();
    const { onRefresh } = renderHero();

    await user.click(screen.getByRole('button', { name: /Atualizar/ }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('says it is busy with aria-disabled, stays in the tab order and keeps the focus while it loads', async () => {
    const user = userEvent.setup();
    const { rerender, onRefresh } = renderHero();
    const button = screen.getByRole('button', { name: /Atualizar/ });
    expect(button).toHaveAttribute('aria-disabled', 'false');
    await user.click(button);
    expect(button).toHaveFocus();

    rerender(<BlogHero isLoading status="" onRefresh={onRefresh} />);

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
    expect(button).toHaveClass('min-h-11', 'vn-focus-ring-ink');
  });

  it('spins its icon only where motion is welcome, and only while it loads', () => {
    const { container, rerender, onRefresh } = renderHero();
    expect(container.querySelector('button svg')?.getAttribute('class')).not.toContain('animate-spin');

    rerender(<BlogHero isLoading status="" onRefresh={onRefresh} />);

    expect(container.querySelector('button svg')?.getAttribute('class')).toContain('motion-safe:animate-spin');
  });

  it('keeps one status region for where the list came from, with the text it is given', () => {
    renderHero({ status: 'Lista salva neste navegador' });

    const regions = screen.getAllByRole('status');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveTextContent('Lista salva neste navegador');
    expect(regions[0]).toHaveClass('text-vn-gray-dark');
  });
});
