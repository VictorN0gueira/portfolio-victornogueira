import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { coverOf, getProjectBySlug } from '../data/projects';
import { renderWithProviders } from '../test/render';
import FeaturedProjectCard from './FeaturedProjectCard';
import ProjectCard from './ProjectCard';
import ProjectDetail from './ProjectDetail';

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('ProjectCard image', () => {
  it('renders the cover with srcset, sizes and its size, so nothing shifts', () => {
    const project = projectOf('diagnostico-empresarial');
    const cover = coverOf(project);
    renderWithProviders(<ProjectCard project={project} />);

    const image = screen.getByRole('img', { name: project.shots[0].alt });

    expect(image).toHaveAttribute('src', cover.src);
    expect(image).toHaveAttribute('srcset', cover.srcSet);
    expect(image.getAttribute('sizes')).toContain('min-width');
    expect(image).toHaveAttribute('width', String(cover.width));
    expect(image).toHaveAttribute('height', String(cover.height));
  });

  it('loads lazily and decodes off the main thread', () => {
    renderWithProviders(<ProjectCard project={projectOf('travel-ia')} />);

    const image = screen.getByRole('img');

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });

  it('does not send a referrer policy tied to an old image host', () => {
    renderWithProviders(<ProjectCard project={projectOf('travel-ia')} />);

    expect(screen.getByRole('img')).not.toHaveAttribute('referrerpolicy');
  });
});

describe('FeaturedProjectCard images', () => {
  it('shows the cover and the two other shots, each with its own alt text, srcset and size', () => {
    const project = projectOf('dizpara');
    renderWithProviders(<FeaturedProjectCard project={project} />);

    const images = screen.getAllByRole('img');

    expect(images.map((image) => image.getAttribute('alt'))).toEqual(project.shots.map((shot) => shot.alt));
    for (const image of images) {
      expect(image).toHaveAttribute('srcset');
      expect(image).toHaveAttribute('sizes');
      expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
      expect(image).toHaveAttribute('decoding', 'async');
    }
  });

  it('loads the cover right away only for the priority card, and the small shots always lazily', () => {
    const { unmount } = renderWithProviders(<FeaturedProjectCard project={projectOf('dizpara')} priority />);
    const [priorityCover, ...priorityRest] = screen.getAllByRole('img');
    expect(priorityCover).toHaveAttribute('loading', 'eager');
    for (const image of priorityRest) expect(image).toHaveAttribute('loading', 'lazy');
    unmount();

    renderWithProviders(<FeaturedProjectCard project={projectOf('hub081')} />);
    for (const image of screen.getAllByRole('img')) expect(image).toHaveAttribute('loading', 'lazy');
  });
});

describe('ProjectDetail images', () => {
  it('renders every shot, cover first, in order', () => {
    const project = projectOf('diagnostico-empresarial');
    renderWithProviders(<ProjectDetail project={project} />);

    const images = screen.getAllByRole('img');

    expect(images).toHaveLength(project.shots.length);
    project.shots.forEach((shot, index) => expect(images[index]).toHaveAttribute('src', shot.image.src));
  });

  it('keeps the descriptive alt texts, without a dash', () => {
    const project = projectOf('travel-ia');
    renderWithProviders(<ProjectDetail project={project} />);

    for (const shot of project.shots) expect(screen.getByRole('img', { name: shot.alt })).toBeInTheDocument();
    for (const image of screen.getAllByRole('img')) expect(image.getAttribute('alt')).not.toMatch(/[\u2013\u2014]/);
  });

  it('gives every image its size and srcset', () => {
    renderWithProviders(<ProjectDetail project={projectOf('diagnostico-empresarial')} />);

    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAttribute('srcset');
      expect(image).toHaveAttribute('sizes');
      expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(image.getAttribute('height'))).toBeGreaterThan(0);
      expect(image).toHaveAttribute('decoding', 'async');
    }
  });

  it.each(['dizpara', 'hub081', 'portal-link-in-bio'])(
    'loads the first image of %s eagerly with high priority and the others lazily',
    (slug) => {
      renderWithProviders(<ProjectDetail project={projectOf(slug)} />);

      const [first, ...rest] = screen.getAllByRole('img');

      expect(first).toHaveAttribute('loading', 'eager');
      expect(first).toHaveAttribute('fetchpriority', 'high');
      for (const image of rest) expect(image).toHaveAttribute('loading', 'lazy');
    },
  );

  it('paints the blurred backdrop from the narrow file', () => {
    const project = projectOf('portal-link-in-bio');
    const { container } = renderWithProviders(<ProjectDetail project={project} />);

    const backdrop = container.querySelector<HTMLElement>('div[style*="background-image"]');

    expect(backdrop?.style.backgroundImage).toContain(coverOf(project).thumbSrc);
  });
});
