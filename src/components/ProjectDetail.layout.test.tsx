import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug, projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import { STICKY_COLUMN_CLASSES } from '../sections/projects/stickyColumn';
import { ProjectDetail } from './ProjectDetail';

function bodyOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-case-body]') as HTMLElement;
}

describe('the layout classes that keep a case page from being cut', () => {
  it.each(projects.map((project) => project.slug))(
    'lets both columns of %s shrink: min-w-0 on the grid items',
    (slug) => {
      const { container } = renderWithProviders(<ProjectDetail project={getProjectBySlug(slug)!} />);

      const [facts, gallery] = Array.from(bodyOf(container).children);

      expect(facts.className).toContain('min-w-0');
      expect(gallery.className).toContain('min-w-0');
    },
  );

  it('stacks the columns below lg and puts them side by side only from lg', () => {
    const { container } = renderWithProviders(<ProjectDetail project={getProjectBySlug('portal-link-in-bio')!} />);

    const body = bodyOf(container);

    expect(body.className).toContain('grid-cols-1');
    expect(body.className).toMatch(/lg:grid-cols-\[/);
    expect(body.className).not.toMatch(/md:grid-cols-\[/);
  });

  it('puts the column of facts before the gallery in the markup, so the text is read before the images', () => {
    const { container } = renderWithProviders(<ProjectDetail project={getProjectBySlug('hub081')!} />);

    const [facts, gallery] = Array.from(bodyOf(container).children);

    expect(facts.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(gallery).toContainElement(screen.getByRole('group'));
    // On a phone the screenshots come first. Only the visual order changes, and the gallery has nothing to focus.
    expect(gallery.className).toContain('max-lg:order-first');
    expect(gallery.querySelector('a, button, [tabindex]')).toBeNull();
  });

  it('shows the highlight phrase of a featured project above the columns and nothing above them for a regular one', () => {
    const featured = renderWithProviders(<ProjectDetail project={getProjectBySlug('dizpara')!} />);
    expect(bodyOf(featured.container).previousElementSibling?.textContent).toBe(getProjectBySlug('dizpara')!.highlight);
    featured.unmount();

    const regular = renderWithProviders(<ProjectDetail project={getProjectBySlug('travel-ia')!} />);
    expect(bodyOf(regular.container).previousElementSibling).toBeNull();
  });

  it('sticks the shorter column, in a window tall enough: the facts of a regular case, the gallery of a featured one', () => {
    const regular = renderWithProviders(<ProjectDetail project={getProjectBySlug('travel-ia')!} />);
    const [regularFacts, regularGallery] = Array.from(bodyOf(regular.container).children);
    expect(regularFacts.className).toContain(STICKY_COLUMN_CLASSES);
    expect(regularGallery.className).not.toContain('sticky');
    regular.unmount();

    const featured = renderWithProviders(<ProjectDetail project={getProjectBySlug('dizpara')!} />);
    const [featuredFacts, featuredGallery] = Array.from(bodyOf(featured.container).children);
    expect(featuredFacts.className).not.toContain('sticky');
    expect(featuredGallery.className).toContain(STICKY_COLUMN_CLASSES);
  });

  it('chooses the sticky column from the content: a featured project without features sticks its facts', () => {
    const project = { ...getProjectBySlug('hub081')!, features: undefined };
    const { container } = renderWithProviders(<ProjectDetail project={project} />);

    const [facts, gallery] = Array.from(bodyOf(container).children);

    expect(facts.className).toContain(STICKY_COLUMN_CLASSES);
    expect(gallery.className).not.toContain('sticky');
  });

  it('chooses the sticky column from the content: a regular project with features keeps its facts sticky', () => {
    const project = { ...getProjectBySlug('travel-ia')!, features: ['Faz uma coisa.', 'Faz outra.'] };
    const { container } = renderWithProviders(<ProjectDetail project={project} />);

    const [facts, gallery] = Array.from(bodyOf(container).children);

    expect(facts.className).toContain(STICKY_COLUMN_CLASSES);
    expect(gallery.className).not.toContain('sticky');
  });

  it('lays a featured gallery out as the cover and two shots side by side, and a regular one as three stacked', () => {
    const featured = renderWithProviders(<ProjectDetail project={getProjectBySlug('dizpara')!} />);
    expect(featured.container.querySelector('[data-gallery-pair]')?.children).toHaveLength(2);
    featured.unmount();

    const regular = renderWithProviders(<ProjectDetail project={getProjectBySlug('portal-link-in-bio')!} />);
    expect(regular.container.querySelector('[data-gallery-pair]')).toBeNull();
    expect(screen.getByRole('group').className).toContain('flex-col');
    expect(screen.getByRole('group').children).toHaveLength(3);
  });

  it('uses the brand only: no zinc, italic, dark: or legacy shadow in the markup', () => {
    for (const slug of ['dizpara', 'ai-playlist-maker']) {
      const { container, unmount } = renderWithProviders(<ProjectDetail project={getProjectBySlug(slug)!} />);

      expect(container.innerHTML).not.toMatch(/zinc|italic|dark:|shadow-2xl/);
      unmount();
    }
  });
});
