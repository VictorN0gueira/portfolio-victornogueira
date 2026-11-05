import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug } from '../../data/projects';
import { projectsCopy } from '../../data/projectsCopy';
import { renderWithProviders } from '../../test/render';
import { NextProject } from './NextProject';

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('NextProject', () => {
  it('names the section by the title of the next project, in an h2, under the kicker', () => {
    const next = projectOf('hub081');
    renderWithProviders(<NextProject project={next} />);

    expect(screen.getByRole('region', { name: next.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: next.title })).toBeInTheDocument();
    expect(screen.getByText(projectsCopy.nextKicker)).toBeInTheDocument();
    expect(screen.getByText(next.category)).toBeInTheDocument();
  });

  it('is one link to the case of the next project, named by the kicker and the title', () => {
    const next = projectOf('travel-ia');
    renderWithProviders(<NextProject project={next} />);

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/projetos/travel-ia');
    expect(screen.getByRole('link')).toHaveAccessibleName(`${projectsCopy.nextKicker} ${next.title}`);
  });

  it('shows the small cover in a browser frame, lazily', () => {
    const next = projectOf('ai-playlist-maker');
    renderWithProviders(<NextProject project={next} />);

    const image = screen.getByRole('img', { name: next.shots[0].alt });

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('src', next.shots[0].image.src);
    expect(screen.getByText(next.slug)).toHaveAttribute('aria-hidden', 'true');
  });

  it('has a focus ring on the link and no legacy look', () => {
    const { container } = renderWithProviders(<NextProject project={projectOf('dizpara')} />);

    expect(screen.getByRole('link').className).toContain('vn-focus-ring-ink');
    expect(container.innerHTML).not.toMatch(/zinc|italic|dark:|vn-accent/);
  });
});
