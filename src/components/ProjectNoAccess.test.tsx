import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import { FeaturedProjectCard } from './FeaturedProjectCard';
import { ProjectCard } from './ProjectCard';
import { ProjectDetail } from './ProjectDetail';

const ACCESS_WORDS = /acessar|acesso restrito|ver projeto|demo|visitar|projeto p\/ cliente|case de cliente|resultados/i;
const CARD_SIZES = '92vw';

function expectNoAccess(container: HTMLElement): void {
  expect(container.querySelector('a[target="_blank"]')).toBeNull();
  expect(container.querySelector('a[href^="http"]')).toBeNull();
  expect(container.querySelector('svg[class*="external"]')).toBeNull();
  expect(container.textContent).not.toMatch(ACCESS_WORDS);
}

describe.each(projects.map((project) => [project.slug, project] as const))(
  '%s has no access link and no invented result',
  (_slug, project) => {
    it('on its card, one link to its case page whose name holds the title and the visible "Ver detalhes"', () => {
      const { container } = renderWithProviders(
        project.featured ? (
          <FeaturedProjectCard project={project} />
        ) : (
          <ProjectCard project={project} imageSizes={CARD_SIZES} />
        ),
      );

      expectNoAccess(container);
      const link = screen.getByRole('link');
      expect(screen.getAllByRole('link')).toHaveLength(1);
      expect(link).toHaveAttribute('href', `/projetos/${project.slug}`);
      expect(link).toHaveAccessibleName(`${project.title} Ver detalhes`);
      expect(within(link).getByText('Ver detalhes')).toBeInTheDocument();
    });

    it('on its case page, no link but the one to /contato, no button, and no Resultados block', () => {
      const { container } = renderWithProviders(<ProjectDetail project={project} />);

      expectNoAccess(container);
      expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/contato']);
      expect(screen.queryAllByRole('button')).toHaveLength(0);
      expect(screen.queryByText('Resultados')).toBeNull();
    });
  },
);

describe('the card names', () => {
  it('are unique, so a list of links does not repeat "Ver detalhes" for assistive technology', () => {
    const names = projects.map((project) => {
      const { unmount } = renderWithProviders(
        project.featured ? (
          <FeaturedProjectCard project={project} />
        ) : (
          <ProjectCard project={project} imageSizes={CARD_SIZES} />
        ),
      );
      const name = screen.getByRole('link').getAttribute('aria-labelledby') ?? '';
      const text = name
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');
      unmount();
      return text;
    });

    expect(new Set(names).size).toBe(projects.length);
  });
});

describe('ProjectDetail text', () => {
  it('lists what a featured project does, under an O que faz heading, and every project has its tags under their own heading', () => {
    const project = projects[0];
    renderWithProviders(<ProjectDetail project={project} />);

    const features = screen.getByRole('heading', { level: 2, name: 'O que faz' }).parentElement as HTMLElement;

    expect(within(features).getAllByRole('listitem')).toHaveLength(project.features?.length ?? -1);
    expect(
      within(
        screen.getByRole('heading', { level: 2, name: 'Tecnologias e recursos' }).parentElement as HTMLElement,
      ).getAllByRole('listitem'),
    ).toHaveLength(project.tags.length);
  });

  it('has h2 sections only, under the h1 of the hero: no heading level is skipped', () => {
    for (const project of [projects[0], projects[2]]) {
      const { unmount } = renderWithProviders(<ProjectDetail project={project} />);
      const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName.slice(1)));

      expect(levels.length).toBeGreaterThan(0);
      expect(levels.every((level) => level === 2)).toBe(true);
      unmount();
    }
  });
});
