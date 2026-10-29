import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import FeaturedProjectCard from './FeaturedProjectCard';
import ProjectCard from './ProjectCard';
import ProjectDetail from './ProjectDetail';

const ACCESS_WORDS = /acessar|acesso restrito|ver projeto|demo|visitar|projeto p\/ cliente|case de cliente/i;

function expectNoAccess(container: HTMLElement): void {
  expect(container.querySelector('a[target="_blank"]')).toBeNull();
  expect(container.querySelector('a[href^="http"]')).toBeNull();
  expect(container.querySelector('.lucide-external-link')).toBeNull();
  expect(container.textContent).not.toMatch(ACCESS_WORDS);
}

describe.each(projects.map((project) => [project.slug, project] as const))('%s has no access link', (_slug, project) => {
  it('on its card', () => {
    const { container } = renderWithProviders(
      project.featured ? <FeaturedProjectCard project={project} /> : <ProjectCard project={project} />,
    );

    expectNoAccess(container);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/projetos/${project.slug}`);
  });

  it('on its case page', () => {
    const { container } = renderWithProviders(<ProjectDetail project={project} />);

    expectNoAccess(container);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('ProjectDetail text', () => {
  it('lists what a featured project does, under an O que faz heading', () => {
    const project = projects[0];
    renderWithProviders(<ProjectDetail project={project} />);

    const heading = screen.getByRole('heading', { name: 'O que faz' });
    const list = heading.parentElement as HTMLElement;

    expect(within(list).getAllByRole('listitem')).toHaveLength(project.features?.length ?? -1);
  });

  it('does not show a Resultados block for Hub081', () => {
    renderWithProviders(<ProjectDetail project={projects[1]} />);

    expect(screen.queryByText('Resultados')).toBeNull();
  });
});
