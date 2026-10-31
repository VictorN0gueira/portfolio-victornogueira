import { describe, expect, it } from 'vitest';
import { routerBasename } from './routerBasename';

describe('routerBasename', () => {
  it('is empty on a host that serves the site from the root', () => {
    expect(routerBasename('/')).toBe('');
  });

  it('is the folder of a project page, without the trailing slash, so the routes match under it', () => {
    expect(routerBasename('/portfolio-victornogueira/')).toBe('/portfolio-victornogueira');
  });

  it('leaves a base that has no trailing slash as it is', () => {
    expect(routerBasename('/app')).toBe('/app');
  });

  it('reads the base of the build by default, which is the root in a test', () => {
    expect(routerBasename()).toBe('');
  });
});
