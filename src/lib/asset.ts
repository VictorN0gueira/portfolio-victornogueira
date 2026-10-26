// Vite only rewrites public asset references found in index.html and CSS.
// URLs built in TSX must be resolved against the configured `base`
// (`/` by default, `/portfolio-victornogueira/` on GitHub Pages).
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
