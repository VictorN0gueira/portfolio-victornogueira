import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug } from '../data/projects';
import { renderWithProviders } from '../test/render';
import ProjectCard from './ProjectCard';
import ProjectDetail from './ProjectDetail';

function projectOf(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('ProjectCard image', () => {
  it('renders the cover with srcset, sizes and its size, so nothing shifts', () => {
    const project = projectOf('troco');
    renderWithProviders(<ProjectCard project={project} />);

    const image = screen.getByRole('img', { name: 'Screenshot do projeto Trocô' });

    expect(image).toHaveAttribute('src', project.image.src);
    expect(image).toHaveAttribute('srcset', project.image.srcSet);
    expect(image.getAttribute('sizes')).toContain('min-width');
    expect(image).toHaveAttribute('width', String(project.image.width));
    expect(image).toHaveAttribute('height', String(project.image.height));
  });

  it('loads lazily and decodes off the main thread', () => {
    renderWithProviders(<ProjectCard project={projectOf('dizpara')} />);

    const image = screen.getByRole('img', { name: 'Screenshot do projeto DizPara' });

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });

  it('no longer sends a referrer policy tied to the old image host', () => {
    renderWithProviders(<ProjectCard project={projectOf('troco')} />);

    expect(screen.getByRole('img')).not.toHaveAttribute('referrerpolicy');
  });
});

describe('ProjectDetail images', () => {
  it('renders the cover plus every gallery image, in order', () => {
    const project = projectOf('troco');
    renderWithProviders(<ProjectDetail project={project} />);

    const images = screen.getAllByRole('img');

    expect(images).toHaveLength(1 + (project.gallery?.length ?? 0));
    expect(images[0]).toHaveAttribute('src', project.image.src);
    expect(images[1]).toHaveAttribute('src', project.gallery?.[0].src);
  });

  it('keeps the descriptive alt texts, without a dash', () => {
    renderWithProviders(<ProjectDetail project={projectOf('troco')} />);

    expect(screen.getByRole('img', { name: 'Trocô, imagem principal' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Trocô, imagem 2' })).toBeInTheDocument();
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

  it('loads the first image eagerly with high priority and the others lazily', () => {
    renderWithProviders(<ProjectDetail project={projectOf('dizpara')} />);

    const [first, ...rest] = screen.getAllByRole('img');

    expect(first).toHaveAttribute('loading', 'eager');
    expect(first).toHaveAttribute('fetchpriority', 'high');
    for (const image of rest) expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('paints the blurred backdrop from the narrow file', () => {
    const project = projectOf('troco');
    const { container } = renderWithProviders(<ProjectDetail project={project} />);

    const backdrop = container.querySelector<HTMLElement>('div[style*="background-image"]');

    expect(backdrop?.style.backgroundImage).toContain(project.image.thumbSrc);
  });
});
