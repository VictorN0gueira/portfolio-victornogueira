// Vite only rewrites public asset references found in index.html and CSS.
// URLs built in TSX must be resolved against the configured `base`
// (`/` by default, `/portfolio-victornogueira/` on GitHub Pages).
// Outside Vite (the Playwright tests import the route metadata, which reads the project data) there is no
// `import.meta.env`, and the base is `/`.
export function assetUrl(path: string): string {
  const base: string = import.meta.env?.BASE_URL ?? '/';
  return `${base}${path.replace(/^\/+/, '')}`;
}
