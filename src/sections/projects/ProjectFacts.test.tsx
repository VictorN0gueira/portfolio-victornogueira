import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CONTACT_LABEL, FEATURES_LABEL, PROJECT_CTA_TEXT, TAGS_LABEL } from '../../components/projectLabels';
import { getProjectBySlug } from '../../data/projects';
import { projectsCopy } from '../../data/projectsCopy';
import { renderWithProviders } from '../../test/render';
import { ProjectFacts } from './ProjectFacts';

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('ProjectFacts', () => {
  it('lists what a featured project does, under an "O que faz" heading', () => {
    const project = projectOf('dizpara');
    renderWithProviders(<ProjectFacts project={project} />);

    const features = screen.getByRole('region', { name: FEATURES_LABEL });

    expect(
      within(features)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([...(project.features ?? [])]);
  });

  it('has no "O que faz" block for a project that has no features', () => {
    renderWithProviders(<ProjectFacts project={projectOf('travel-ia')} />);

    expect(screen.queryByRole('region', { name: FEATURES_LABEL })).toBeNull();
    expect(screen.queryByText(FEATURES_LABEL)).toBeNull();
  });

  it.each(['dizpara', 'travel-ia'])('lists the tags of %s under their own heading', (slug) => {
    const project = projectOf(slug);
    renderWithProviders(<ProjectFacts project={project} />);

    const tags = screen.getByRole('region', { name: TAGS_LABEL });

    expect(
      within(tags)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([...project.tags]);
  });

  it('shows the category with its label', () => {
    const project = projectOf('portal-link-in-bio');
    renderWithProviders(<ProjectFacts project={project} />);

    expect(screen.getByText(projectsCopy.categoryLabel)).toBeInTheDocument();
    expect(screen.getByText(project.category)).toBeInTheDocument();
  });

  it('invites the visitor with one link to /contato, and no other link', () => {
    renderWithProviders(<ProjectFacts project={projectOf('hub081')} />);

    expect(screen.getByText(PROJECT_CTA_TEXT)).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: CONTACT_LABEL })).toHaveAttribute('href', '/contato');
    expect(screen.getByRole('link', { name: CONTACT_LABEL }).querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('uses h2 for its headings only, so no level is skipped under the h1 of the page', () => {
    renderWithProviders(<ProjectFacts project={projectOf('dizpara')} />);

    const levels = screen.getAllByRole('heading').map((heading) => heading.tagName);

    expect(levels.length).toBeGreaterThan(0);
    expect(new Set(levels)).toEqual(new Set(['H2']));
  });

  it('is sticky from lg, and the brand only: no zinc, italic or dark: class', () => {
    const { container } = renderWithProviders(<ProjectFacts project={projectOf('dizpara')} />);

    expect(container.firstElementChild?.className).toContain('lg:sticky');
    expect(container.firstElementChild?.className).toContain('lg:top-28');
    expect(container.firstElementChild?.className).toContain('lg:self-start');
    expect(container.innerHTML).not.toMatch(/zinc|italic|dark:/);
  });
});
