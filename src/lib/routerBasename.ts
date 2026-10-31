/**
 * The basename of the router: the base the build was made for (vite `base`, which is a folder on GitHub Pages) without
 * its trailing slash. Empty when the site is served from the root.
 */
export function routerBasename(baseUrl: string = import.meta.env.BASE_URL): string {
  return baseUrl.replace(/\/$/, '');
}
