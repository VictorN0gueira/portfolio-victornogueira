import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { coverOf, getProjectBySlug, projects } from '../data/projects';
import { renderWithProviders } from '../test/render';
import FeaturedProjectCard from './FeaturedProjectCard';
import ProjectCard from './ProjectCard';
import ProjectDetail from './ProjectDetail';

const CARD_SIZES = '(min-width: 1280px) 368px, 92vw';
const MAX_PORTRAIT_REM = 32;

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('ProjectCard image', () => {
  it('renders the cover with srcset, the sizes it was given and its size, so nothing shifts', () => {
    const project = projectOf('diagnostico-empresarial');
    const cover = coverOf(project);
    renderWithProviders(<ProjectCard project={project} imageSizes={CARD_SIZES} />);

    const image = screen.getByRole('img', { name: project.shots[0].alt });

    expect(image).toHaveAttribute('src', cover.src);
    expect(image).toHaveAttribute('srcset', cover.srcSet);
    expect(image).toHaveAttribute('sizes', CARD_SIZES);
    expect(image).toHaveAttribute('width', String(cover.width));
    expect(image).toHaveAttribute('height', String(cover.height));
  });

  it('loads lazily, decodes off the main thread and sets no priority', () => {
    renderWithProviders(<ProjectCard project={projectOf('travel-ia')} imageSizes={CARD_SIZES} />);

    const image = screen.getByRole('img');

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('fetchpriority', 'auto');
  });
});

describe('FeaturedProjectCard images', () => {
  it('shows the cover and the two other shots, each with its own alt text, srcset and size', () => {
    const project = projectOf('dizpara');
    renderWithProviders(<FeaturedProjectCard project={project} />);

    const images = screen.getAllByRole('img', { hidden: true });

    expect(images.map((image) => image.getAttribute('alt'))).toEqual(project.shots.map((shot) => shot.alt));
    for (const image of images) {
      expect(image).toHaveAttribute('srcset');
      expect(image).toHaveAttribute('sizes');
      expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
      expect(image).toHaveAttribute('decoding', 'async');
    }
  });

  it('loads the cover right away, with high priority, only for the priority card, and the small shots always lazily', () => {
    const { unmount } = renderWithProviders(<FeaturedProjectCard project={projectOf('dizpara')} priority />);
    const [priorityCover, ...priorityRest] = screen.getAllByRole('img', { hidden: true });
    expect(priorityCover).toHaveAttribute('loading', 'eager');
    expect(priorityCover).toHaveAttribute('fetchpriority', 'high');
    for (const image of priorityRest) expect(image).toHaveAttribute('loading', 'lazy');
    unmount();

    renderWithProviders(<FeaturedProjectCard project={projectOf('hub081')} />);
    for (const image of screen.getAllByRole('img', { hidden: true })) {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('fetchpriority', 'auto');
    }
  });

  it('puts the name before the image descriptions in the markup, so a screen reader meets it first', () => {
    const { container } = renderWithProviders(<FeaturedProjectCard project={projectOf('hub081')} />);

    const heading = container.querySelector('h2') as HTMLElement;
    const firstImage = container.querySelector('img') as HTMLElement;

    expect(heading.compareDocumentPosition(firstImage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('ProjectDetail images', () => {
  it.each(projects.map((project) => project.slug))('renders the three shots of %s, cover first, in order', (slug) => {
    const project = projectOf(slug);
    renderWithProviders(<ProjectDetail project={project} />);

    const images = screen.getAllByRole('img');

    expect(images).toHaveLength(3);
    project.shots.forEach((shot, index) => expect(images[index]).toHaveAttribute('src', shot.image.src));
  });

  it('keeps the descriptive alt texts', () => {
    const project = projectOf('travel-ia');
    renderWithProviders(<ProjectDetail project={project} />);

    for (const shot of project.shots) expect(screen.getByRole('img', { name: shot.alt })).toBeInTheDocument();
  });

  it.each(projects.map((project) => project.slug))('gives every image of %s its size, srcset and a reserved aspect ratio', (slug) => {
    renderWithProviders(<ProjectDetail project={projectOf(slug)} />);

    for (const image of screen.getAllByRole('img')) {
      const width = Number(image.getAttribute('width'));
      const height = Number(image.getAttribute('height'));
      expect(image).toHaveAttribute('srcset');
      expect(image).toHaveAttribute('sizes');
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(image).toHaveAttribute('decoding', 'async');
      expect((image as HTMLElement).style.aspectRatio.replace(/\s/g, '')).toBe(`${width}/${height}`);
    }
  });

  it('reserves a box for a tall phone shot: its own ratio and a width that stops it at a fixed height', () => {
    renderWithProviders(<ProjectDetail project={projectOf('ai-playlist-maker')} />);

    const tall = screen.getAllByRole('img').find((image) => Number(image.getAttribute('height')) > Number(image.getAttribute('width')));
    const width = Number(tall?.getAttribute('width'));
    const height = Number(tall?.getAttribute('height'));

    expect(tall).toBeDefined();
    expect((tall as HTMLElement).style.width).toBe(`min(100%, ${((MAX_PORTRAIT_REM * width) / height).toFixed(2)}rem)`);
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

  it('paints the blurred backdrop from the narrow file, and hides it from assistive technology', () => {
    const project = projectOf('portal-link-in-bio');
    const { container } = renderWithProviders(<ProjectDetail project={project} />);

    const backdrop = container.querySelector<HTMLElement>('div[style*="background-image"]');

    expect(backdrop?.style.backgroundImage).toContain(coverOf(project).thumbSrc);
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  });

  it('groups the images of both gallery layouts under the same label, and has no scroll container to tab into', () => {
    for (const slug of ['dizpara', 'portal-link-in-bio']) {
      const project = projectOf(slug);
      const { container, unmount } = renderWithProviders(<ProjectDetail project={project} />);

      expect(screen.getByRole('group', { name: `Telas de ${project.title}` })).toBeInTheDocument();
      expect(container.querySelector('[tabindex]')).toBeNull();
      unmount();
    }
  });
});
