import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug, projects } from '../../data/projects';
import { renderWithProviders } from '../../test/render';
import { ProjectHighlight } from './ProjectHighlight';

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('ProjectHighlight', () => {
  it.each(['dizpara', 'hub081'])('shows the highlight phrase of %s with the 3px ink rule', (slug) => {
    const project = projectOf(slug);
    const { container } = renderWithProviders(<ProjectHighlight project={project} />);

    expect(screen.getByText(project.highlight as string)).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('border-t-[3px]');
    expect(container.firstElementChild?.className).toContain('border-vn-ink');
  });

  it.each(projects.filter((project) => !project.highlight).map((project) => project.slug))(
    'renders nothing for %s, which has no highlight phrase, and takes no space',
    (slug) => {
      const { container } = renderWithProviders(<ProjectHighlight project={projectOf(slug)} />);

      expect(container).toBeEmptyDOMElement();
    },
  );

  it('adds no text and no digit of its own: what it shows is the phrase of the data and nothing else', () => {
    const project = projectOf('dizpara');
    const { container } = renderWithProviders(<ProjectHighlight project={project} />);

    expect(container.textContent).toBe(project.highlight);
  });

  it('has no count-up, no accent and no legacy look', () => {
    const { container } = renderWithProviders(<ProjectHighlight project={projectOf('hub081')} />);

    expect(container.innerHTML).not.toMatch(/vn-accent|zinc|italic|dark:/);
    expect(container.querySelector('[data-count-up], output')).toBeNull();
  });
});
