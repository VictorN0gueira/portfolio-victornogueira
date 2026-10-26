import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetUrl } from './asset';

describe('assetUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps a root path untouched at the default base', () => {
    expect(assetUrl('/brand/vn-one-logo-chrome.webp')).toBe('/brand/vn-one-logo-chrome.webp');
  });

  it('adds the base to a path without a leading slash at the default base', () => {
    expect(assetUrl('brand/vn-one-logo-chrome.webp')).toBe('/brand/vn-one-logo-chrome.webp');
  });

  it('prefixes the GitHub Pages base for a path with a leading slash', () => {
    vi.stubEnv('BASE_URL', '/portfolio-victornogueira/');

    expect(assetUrl('/brand/vn-one-logo-chrome.webp')).toBe(
      '/portfolio-victornogueira/brand/vn-one-logo-chrome.webp',
    );
  });

  it('prefixes the GitHub Pages base for a path without a leading slash', () => {
    vi.stubEnv('BASE_URL', '/portfolio-victornogueira/');

    expect(assetUrl('brand/vn-one-logo-chrome.webp')).toBe(
      '/portfolio-victornogueira/brand/vn-one-logo-chrome.webp',
    );
  });
});
