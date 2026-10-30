import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug, projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import ProjectDetail, { CLEAR_FLOATING_BUTTONS } from './ProjectDetail';

function panelOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[class*="overflow-clip"]') as HTMLElement;
}

describe('the layout classes that keep a case page from being cut', () => {
  it.each(projects.map((project) => project.slug))('lets the text column of %s shrink: min-w-0 on it and on its content', (slug) => {
    const { container } = renderWithProviders(<ProjectDetail project={getProjectBySlug(slug)!} />);

    const column = screen.getByRole('heading', { level: 1 }).closest('[class*="flex-1"]') as HTMLElement;

    expect(column.className).toContain('min-w-0');
    expect(column.firstElementChild?.className).toContain('min-w-0');
    expect(panelOf(container)).toBeTruthy();
  });

  it('stacks the gallery above the text below lg, and puts them side by side only from lg', () => {
    const { container } = renderWithProviders(<ProjectDetail project={getProjectBySlug('portal-link-in-bio')!} />);

    const panel = panelOf(container);

    expect(panel.className).toContain('flex-col');
    expect(panel.className).toContain('lg:flex-row');
    expect(panel.className).not.toContain('md:flex-row');
    expect(screen.getByRole('group').className).toContain('lg:w-[60%]');
    expect(screen.getByRole('group').className).not.toContain('md:w-[60%]');
  });

  it('keeps the padding of the text small below lg, so a narrow column keeps its width', () => {
    renderWithProviders(<ProjectDetail project={getProjectBySlug('diagnostico-empresarial')!} />);

    const column = screen.getByRole('heading', { level: 1 }).closest('[class*="flex-1"]') as HTMLElement;

    expect(column.className).toContain('p-4');
    expect(column.className).toContain('md:p-10');
    expect(column.className).not.toContain('md:p-16');
  });

  it('keeps text clear of the floating buttons on a phone: 36 px under 360, 56 px up to the tablet layout, none from md', () => {
    expect(CLEAR_FLOATING_BUTTONS).toBe('pr-9 min-[360px]:pr-14 md:pr-0');
    renderWithProviders(<ProjectDetail project={getProjectBySlug('hub081')!} />);

    expect(screen.getByRole('heading', { level: 1 }).parentElement?.className).toContain(CLEAR_FLOATING_BUTTONS);
    for (const list of screen.getAllByRole('list')) expect(list.className).toContain(CLEAR_FLOATING_BUTTONS);
  });
});
