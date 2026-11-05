import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getProjectBySlug } from '../../data/projects';
import { renderWithProviders } from '../../test/render';
import { BrowserShot } from './BrowserShot';

const SIZES = '(min-width: 1024px) 560px, 92vw';

function shotOf(slug: string, index = 0) {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project.shots[index];
}

describe('BrowserShot', () => {
  it('keeps the alt text, the srcset, the sizes and the size of the screenshot', () => {
    const shot = shotOf('dizpara');
    renderWithProviders(<BrowserShot shot={shot} slug="dizpara" sizes={SIZES} />);

    const image = screen.getByRole('img', { name: shot.alt });

    expect(image).toHaveAttribute('src', shot.image.src);
    expect(image).toHaveAttribute('srcset', shot.image.srcSet);
    expect(image).toHaveAttribute('sizes', SIZES);
    expect(image).toHaveAttribute('width', String(shot.image.width));
    expect(image).toHaveAttribute('height', String(shot.image.height));
  });

  it('loads lazily by default and eagerly with high priority only when told to', () => {
    const { unmount } = renderWithProviders(<BrowserShot shot={shotOf('hub081')} slug="hub081" sizes={SIZES} />);
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('img')).toHaveAttribute('fetchpriority', 'auto');
    unmount();

    renderWithProviders(<BrowserShot shot={shotOf('hub081')} slug="hub081" sizes={SIZES} priority />);
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager');
    expect(screen.getByRole('img')).toHaveAttribute('fetchpriority', 'high');
  });

  it('shows the slug of the project in the title bar, in the mono font, and no address', () => {
    const { container } = renderWithProviders(<BrowserShot shot={shotOf('travel-ia')} slug="travel-ia" sizes={SIZES} />);

    const title = screen.getByText('travel-ia');

    expect(title.className).toContain('font-mono');
    expect(container.textContent).not.toMatch(/https?:|www\.|\.com/i);
  });

  it('hides the three dots of the frame from assistive technology', () => {
    const { container } = renderWithProviders(<BrowserShot shot={shotOf('dizpara')} slug="dizpara" sizes={SIZES} />);

    const dots = container.querySelector('span[aria-hidden="true"]');

    expect(dots?.children).toHaveLength(3);
  });

  it('passes the classes and the style of the frame and of the image through', () => {
    const { container } = renderWithProviders(
      <BrowserShot
        shot={shotOf('dizpara')}
        slug="dizpara"
        sizes={SIZES}
        className="frame-extra"
        imageClassName="image-extra"
        imageStyle={{ aspectRatio: '2 / 1' }}
      />,
    );

    expect(container.querySelector('.frame-extra')).not.toBeNull();
    expect(screen.getByRole('img').className).toContain('image-extra');
    expect(screen.getByRole('img').style.aspectRatio.replace(/\s/g, '')).toBe('2/1');
  });
});
