import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug } from '../data/projects';
import { renderWithProviders } from '../test/render';
import { FeaturedProjectCard } from './FeaturedProjectCard';

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

/** A paragraph by its whole text: a hyphenated word sits in its own span, so the text is not one text node. */
function paragraphWith(text: string): HTMLElement {
  return screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === text);
}

describe.each(['dizpara', 'hub081'])('FeaturedProjectCard of %s', (slug) => {
  const project = projectOf(slug);

  it('is one link to the case page, named by its title and "Ver detalhes"', () => {
    renderWithProviders(<FeaturedProjectCard project={project} />);

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/projetos/${slug}`);
    expect(screen.getByRole('link')).toHaveAccessibleName(`${project.title} Ver detalhes`);
  });

  it('shows the three shots, the category, the highlight phrase and the description', () => {
    renderWithProviders(<FeaturedProjectCard project={project} />);

    expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(3);
    expect(screen.getByRole('heading', { level: 2, name: project.title })).toBeInTheDocument();
    expect(screen.getByText(project.category)).toBeInTheDocument();
    expect(paragraphWith(project.highlight as string)).toBeInTheDocument();
    expect(paragraphWith(project.description)).toBeInTheDocument();
  });

  it('loads the cover eagerly only with priority, and the two small shots always lazily', () => {
    const { unmount } = renderWithProviders(<FeaturedProjectCard project={project} priority />);
    const [cover, ...strip] = screen.getAllByRole('img', { hidden: true });
    expect(cover).toHaveAttribute('loading', 'eager');
    expect(cover).toHaveAttribute('fetchpriority', 'high');
    for (const image of strip) expect(image).toHaveAttribute('loading', 'lazy');
    unmount();

    renderWithProviders(<FeaturedProjectCard project={project} />);
    for (const image of screen.getAllByRole('img', { hidden: true })) expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('puts the name before the image descriptions in the markup', () => {
    const { container } = renderWithProviders(<FeaturedProjectCard project={project} />);

    const heading = container.querySelector('h2') as HTMLElement;
    const firstImage = container.querySelector('img') as HTMLElement;

    expect(heading.compareDocumentPosition(firstImage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sits on the brand black, has an ink focus ring on the link and uses no accent, zinc or italic', () => {
    const { container } = renderWithProviders(<FeaturedProjectCard project={project} />);

    expect(container.querySelector('.bg-vn-black')).not.toBeNull();
    expect(container.querySelector('.vn-spotlight--dark')).not.toBeNull();
    expect(screen.getByRole('link').className).toContain('vn-focus-ring-ink');
    expect(container.innerHTML).not.toMatch(/zinc|italic|shadow-2xl|dark:|vn-accent/);
  });

  it('has an arrow that settles on keyboard focus as it does under the pointer', () => {
    const { container } = renderWithProviders(<FeaturedProjectCard project={project} />);

    const arrow = container.querySelector('svg[aria-hidden="true"]')?.getAttribute('class') ?? '';

    expect(arrow).toContain('group-hover:translate-x-1');
    expect(arrow).toContain('group-focus-visible:translate-x-1');
  });

  it('hides the two small shots on a phone', () => {
    const { container } = renderWithProviders(<FeaturedProjectCard project={project} />);

    const strip = container.querySelector('[data-featured-strip]');

    expect(strip?.className).toMatch(/\bhidden\b/);
    expect(strip?.className).toContain('sm:grid');
  });
});
