import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  it('lazy loads the logo, it sits at the bottom of the page', () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const logo = container.querySelector('img[src$="vn-one-logo-chrome.webp"]');
    expect(logo).toHaveAttribute('loading', 'lazy');
    expect(logo).toHaveAttribute('alt', 'VN One');
  });
});
