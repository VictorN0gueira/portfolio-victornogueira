import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CONTACT_LABEL, FEATURES_LABEL, PROJECT_CTA_TEXT, TAGS_LABEL } from '../../components/projectLabels';
import { getProjectBySlug } from '../../data/projects';
import { projectsCopy } from '../../data/projectsCopy';
import { renderWithProviders } from '../../test/render';
import { ProjectFacts } from './ProjectFacts';
import { STICKY_COLUMN_CLASSES } from './stickyColumn';

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('ProjectFacts', () => {
  it('lists what a featured project does, under an "O que faz" heading', () => {
    const project = projectOf('dizpara');
    renderWithProviders(<ProjectFacts project={project} />);

    const features = screen.getByRole('heading', { level: 2, name: FEATURES_LABEL }).parentElement as HTMLElement;

    expect(
      within(features)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([...(project.features ?? [])]);
  });

  it('has no "O que faz" block for a project that has no features', () => {
    renderWithProviders(<ProjectFacts project={projectOf('travel-ia')} />);

    expect(screen.queryByRole('heading', { name: FEATURES_LABEL })).toBeNull();
    expect(screen.queryByText(FEATURES_LABEL)).toBeNull();
  });

  it.each(['dizpara', 'travel-ia'])('lists the tags of %s under their own heading', (slug) => {
    const project = projectOf(slug);
    renderWithProviders(<ProjectFacts project={project} />);

    const tags = screen.getByRole('heading', { level: 2, name: TAGS_LABEL }).parentElement as HTMLElement;

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
    const link = screen.getByRole('link');

    expect(link).toHaveAttribute('href', '/contato');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses h2 for its headings only, so no level is skipped under the h1 of the page', () => {
    renderWithProviders(<ProjectFacts project={projectOf('dizpara')} />);

    const levels = screen.getAllByRole('heading').map((heading) => heading.tagName);

    expect(levels.length).toBeGreaterThan(0);
    expect(new Set(levels)).toEqual(new Set(['H2']));
  });

  it('names its link by the visible text first and the project after it, so the two links to /contato of a case differ', () => {
    const project = projectOf('hub081');
    renderWithProviders(<ProjectFacts project={project} />);

    expect(screen.getByRole('link')).toHaveAccessibleName(`${CONTACT_LABEL} sobre ${project.title}`);
    expect(screen.getByRole('link').textContent).toContain(CONTACT_LABEL);
  });

  it('adds no region landmark: the blocks are headings with their content, not sections', () => {
    const { container } = renderWithProviders(<ProjectFacts project={projectOf('dizpara')} />);

    expect(container.querySelector('section, [role="region"], [aria-labelledby]')).toBeNull();
  });

  it('carries the sticky classes only when asked (that it sticks is measured in e2e/page-projeto.spec.ts)', () => {
    const sticky = renderWithProviders(<ProjectFacts project={projectOf('travel-ia')} />);
    expect(sticky.container.firstElementChild?.className).toContain(STICKY_COLUMN_CLASSES);
    sticky.unmount();

    const plain = renderWithProviders(<ProjectFacts project={projectOf('travel-ia')} isSticky={false} />);
    expect(plain.container.firstElementChild?.className).not.toContain('sticky');
  });

  it('uses the brand only: no zinc, italic or dark: class', () => {
    const { container } = renderWithProviders(<ProjectFacts project={projectOf('dizpara')} />);

    expect(container.innerHTML).not.toMatch(/zinc|italic|dark:/);
  });
});
