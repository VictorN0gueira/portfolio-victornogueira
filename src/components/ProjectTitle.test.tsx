import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug } from '../data/projects';
import { renderWithProviders } from '../test/render';
import { ProjectCard } from './ProjectCard';
import { ProjectDetail } from './ProjectDetail';
import { ProjectTitle } from './ProjectTitle';

describe('ProjectTitle', () => {
  it('keeps the whole text and wraps only the hyphenated word in a no-wrap span', () => {
    const { container } = render(<h1><ProjectTitle title="Portal Link-in-Bio" /></h1>);

    expect(container.textContent).toBe('Portal Link-in-Bio');
    expect([...container.querySelectorAll('span')].map((span) => [span.textContent, span.className])).toEqual([['Link-in-Bio', 'whitespace-nowrap']]);
  });

  it('adds nothing to a title without a hyphen', () => {
    const { container } = render(<h1><ProjectTitle title="Travel IA" /></h1>);

    expect(container.querySelector('span')).toBeNull();
    expect(container.textContent).toBe('Travel IA');
  });

  it('leaves the heading of the case page and of the card named "Portal Link-in-Bio"', () => {
    const project = getProjectBySlug('portal-link-in-bio')!;
    const { unmount } = renderWithProviders(<ProjectDetail project={project} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Portal Link-in-Bio' })).toBeInTheDocument();
    unmount();

    renderWithProviders(<ProjectCard project={project} imageSizes="92vw" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Portal Link-in-Bio' })).toBeInTheDocument();
  });
});
