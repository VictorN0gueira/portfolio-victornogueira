import { SITE } from '../lib/site';
import { escapeHtml } from './headHtml';
import type { RouteMeta } from './routeMeta';

// The sitemap of the site, from the metadata of the routes (batch R). Only the routes in the index are listed. It has no
// changefreq and no priority: Google ignores both, and lastmod is the date of the content the data says.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function entryOf(meta: RouteMeta): string {
  // One url per page: the canonical has no trailing slash (decision D7), and nginx redirects the slash to the bare path.
  if (meta.path !== '/' && meta.path.endsWith('/')) throw new Error(`the path ${meta.path} ends with a slash`);
  if (!ISO_DATE.test(meta.lastmod)) throw new Error(`the lastmod of ${meta.path} is not YYYY-MM-DD: ${meta.lastmod}`);
  return `  <url>\n    <loc>${escapeHtml(`${SITE.url}${meta.path}`)}</loc>\n    <lastmod>${meta.lastmod}</lastmod>\n  </url>`;
}

/** The sitemap.xml text of the routes in the index. A path listed twice is an error in the data. */
export function renderSitemap(metas: readonly RouteMeta[]): string {
  const listed = metas.filter((meta) => meta.isIndexable);
  const paths = listed.map((meta) => meta.path);
  const duplicate = paths.find((path, index) => paths.indexOf(path) !== index);
  if (duplicate !== undefined) throw new Error(`${duplicate} is listed twice in the sitemap`);

  const body = listed.map(entryOf).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
