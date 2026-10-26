import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import Header from './Header';

function renderHeader() {
  const view = render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
  const homeLink = screen.getByRole('link', { name: /página inicial/i });
  const logos = Array.from(homeLink.querySelectorAll('img'));
  return { ...view, homeLink, logos };
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('Header logo', () => {
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('stacks the dark and the chrome artwork so they can crossfade', () => {
    const { logos } = renderHeader();

    expect(logos).toHaveLength(2);
    expect(logos[0].getAttribute('src')).toMatch(/vn-one-logo-dark\.webp$/);
    expect(logos[1].getAttribute('src')).toMatch(/vn-one-logo-chrome\.webp$/);
  });

  it('crossfades with an opacity transition that follows the 500ms background fade', () => {
    const { logos } = renderHeader();

    for (const logo of logos) {
      expect(logo).toHaveClass('transition-opacity', 'duration-500');
    }
  });

  it('shows only the dark artwork, exposed to assistive tech, before scrolling', () => {
    const { logos } = renderHeader();
    const [dark, chrome] = logos;

    expect(dark).toHaveClass('opacity-100');
    expect(dark).toHaveAttribute('alt', 'VN One');
    expect(dark).not.toHaveAttribute('aria-hidden');
    expect(chrome).toHaveClass('opacity-0');
    expect(chrome).toHaveAttribute('alt', '');
    expect(chrome).toHaveAttribute('aria-hidden', 'true');
  });

  it('swaps to the chrome artwork and its accessible name after scrolling', async () => {
    const { logos } = renderHeader();
    const [dark, chrome] = logos;

    scrollTo(100);

    await waitFor(() => expect(chrome).toHaveClass('opacity-100'));
    expect(chrome).toHaveAttribute('alt', 'VN One');
    expect(chrome).not.toHaveAttribute('aria-hidden');
    expect(dark).toHaveClass('opacity-0');
    expect(dark).toHaveAttribute('alt', '');
    expect(dark).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps exactly one image named VN One at any time', async () => {
    renderHeader();
    expect(screen.getAllByAltText('VN One')).toHaveLength(1);

    scrollTo(100);

    await waitFor(() =>
      expect(screen.getByAltText('VN One').getAttribute('src')).toMatch(/vn-one-logo-chrome\.webp$/),
    );
    expect(screen.getAllByAltText('VN One')).toHaveLength(1);
  });
});
