import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug, projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import { ProjectCard } from './ProjectCard';

const SIZES = '(min-width: 1280px) 368px, 92vw';
const REGULAR = projects.filter((project) => !project.featured);

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('ProjectCard', () => {
  it.each(REGULAR.map((project) => project.slug))('is one link to the case page of %s, named by its title and "Ver detalhes"', (slug) => {
    const project = projectOf(slug);
    renderWithProviders(<ProjectCard project={project} imageSizes={SIZES} />);

    const link = screen.getByRole('link');

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(link).toHaveAttribute('href', `/projetos/${slug}`);
    expect(link).toHaveAccessibleName(`${project.title} Ver detalhes`);
  });

  it('puts the title in an h2 and the tags in a list', () => {
    const project = projectOf('travel-ia');
    renderWithProviders(<ProjectCard project={project} imageSizes={SIZES} />);

    expect(screen.getByRole('heading', { level: 2, name: project.title })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)).toEqual([...project.tags]);
  });

  it('shows the category and the description', () => {
    const project = projectOf('ai-playlist-maker');
    renderWithProviders(<ProjectCard project={project} imageSizes={SIZES} />);

    expect(screen.getByText(project.category)).toBeInTheDocument();
    expect(screen.getByText(project.description)).toBeInTheDocument();
  });

  it('frames the cover with the slug in the title bar and loads it lazily, with the sizes it was given', () => {
    const project = projectOf('portal-link-in-bio');
    renderWithProviders(<ProjectCard project={project} imageSizes={SIZES} />);

    const image = screen.getByRole('img', { name: project.shots[0].alt });

    expect(screen.getByText(project.slug)).toBeInTheDocument();
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('sizes', SIZES);
    expect(image.className).toContain('object-left-top');
  });

  it('hides the arrow of the call to action from assistive technology', () => {
    const { container } = renderWithProviders(<ProjectCard project={projectOf('travel-ia')} imageSizes={SIZES} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has a focus ring on the link and no legacy look: no zinc, italic, shadow-2xl or dark: class', () => {
    const { container } = renderWithProviders(<ProjectCard project={projectOf('dashboard-consumo-crm')} imageSizes={SIZES} />);

    expect(screen.getByRole('link').className).toContain('vn-focus-ring-ink');
    expect(container.innerHTML).not.toMatch(/zinc|italic|shadow-2xl|dark:/);
  });

  it('is a spotlight card, so the glow and the ring come with a fine pointer and stay off on touch', () => {
    const { container } = renderWithProviders(<ProjectCard project={projectOf('travel-ia')} imageSizes={SIZES} />);

    expect(container.querySelector('.vn-spotlight')).not.toBeNull();
  });
});
