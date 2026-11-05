import { serializeJsonLd } from '../lib/jsonLd';
import { SITE } from '../lib/site';
import type { RouteCrumb, RouteMeta } from './routeMeta';

// Pure functions that turn the metadata of a route into the HTML of its head, for the build step (scripts/build-seo.mjs).
// Nothing here is imported by the app, so none of it reaches the bundle. Every tag carries data-static-seo: SEO.tsx removes
// them when the page mounts and writes its own, so a page never keeps two of each.

const STATIC_ATTR = 'data-static-seo';
const START_MARKER = '<!-- seo:start -->';
const END_MARKER = '<!-- seo:end -->';
const BODY_END = '</body>';
const SHARE_IMAGE_WIDTH = 1200;
const SHARE_IMAGE_HEIGHT = 630;
const NOINDEX = 'noindex, nofollow';
const BRAND_SUFFIX = ` | ${SITE.name}`;
const BRAND_PREFIX = `${SITE.name} | `;

/** The meta of the page the server answers for a path the site does not have: out of the index, with the title of the app's own 404. */
export const NOT_FOUND_META: RouteMeta = {
  path: '/404',
  kind: 'page',
  title: `Página não encontrada${BRAND_SUFFIX}`,
  description: 'A página que você procura não existe ou mudou de endereço. Volte para o início e siga por lá.',
  isIndexable: false,
  lastmod: '2026-11-01',
  crumbs: [],
};

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Text for an element or an attribute value: the five characters that can end either of them are written as entities. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const urlOf = (path: string): string => `${SITE.url}${path}`;

const metaTag = (attribute: 'name' | 'property', key: string, content: string): string =>
  `<meta ${attribute}="${key}" content="${escapeHtml(content)}" ${STATIC_ATTR} />`;

function shareImageOf(meta: RouteMeta) {
  return {
    url: meta.image?.url ?? SITE.ogImage,
    alt: meta.image?.alt ?? SITE.ogImageAlt,
    width: meta.image?.width ?? SHARE_IMAGE_WIDTH,
    height: meta.image?.height ?? SHARE_IMAGE_HEIGHT,
  };
}

function openGraphTags(meta: RouteMeta): string[] {
  const image = shareImageOf(meta);
  return [
    metaTag('property', 'og:type', 'website'),
    ...(meta.isIndexable ? [metaTag('property', 'og:url', urlOf(meta.path))] : []),
    metaTag('property', 'og:title', meta.title),
    metaTag('property', 'og:description', meta.description),
    metaTag('property', 'og:image', image.url),
    metaTag('property', 'og:image:width', String(image.width)),
    metaTag('property', 'og:image:height', String(image.height)),
    metaTag('property', 'og:image:alt', image.alt),
    metaTag('property', 'og:locale', 'pt_BR'),
    metaTag('property', 'og:site_name', SITE.name),
  ];
}

function twitterTags(meta: RouteMeta): string[] {
  const image = shareImageOf(meta);
  return [
    metaTag('name', 'twitter:card', 'summary_large_image'),
    ...(meta.isIndexable ? [metaTag('name', 'twitter:url', urlOf(meta.path))] : []),
    metaTag('name', 'twitter:title', meta.title),
    metaTag('name', 'twitter:description', meta.description),
    metaTag('name', 'twitter:image', image.url),
    metaTag('name', 'twitter:image:alt', image.alt),
  ];
}

const jsonLdTag = (node: object): string => `<script type="application/ld+json" ${STATIC_ATTR}>${serializeJsonLd(node)}</script>`;

/**
 * The tags of the head that depend on the route: title, description, canonical (or noindex), og, twitter and JSON-LD.
 * A route out of the index has a robots noindex and no canonical, og:url or twitter:url, as SEO.tsx writes it.
 */
export function renderSeoHead(meta: RouteMeta, jsonLd: readonly object[]): string {
  return [
    `<title ${STATIC_ATTR}>${escapeHtml(meta.title)}</title>`,
    metaTag('name', 'description', meta.description),
    ...(meta.isIndexable
      ? [`<link rel="canonical" href="${escapeHtml(urlOf(meta.path))}" ${STATIC_ATTR} />`]
      : [metaTag('name', 'robots', NOINDEX)]),
    ...openGraphTags(meta),
    ...twitterTags(meta),
    ...jsonLd.map(jsonLdTag),
  ].join('\n    ');
}

/**
 * Swaps what is between the seo markers of the built index.html for the head of a route. The markers stay, so the result
 * can be swapped again. A missing or misplaced marker is an error: a silent no-op would ship the home head on every route.
 */
export function applyHeadToTemplate(template: string, head: string): string {
  const start = template.indexOf(START_MARKER);
  const end = template.indexOf(END_MARKER);
  if (start === -1) throw new Error(`the template has no ${START_MARKER} marker`);
  if (end === -1) throw new Error(`the template has no ${END_MARKER} marker`);
  if (end < start) throw new Error(`the markers are out of order: ${END_MARKER} comes before ${START_MARKER}`);

  const before = template.slice(0, start + START_MARKER.length);
  const after = template.slice(end);
  return `${before}\n    ${head}\n    ${after}`;
}

/** The title of a page without the brand: the text of its h1 and of its link. */
export function topicOf(meta: RouteMeta): string {
  if (meta.title.endsWith(BRAND_SUFFIX)) return meta.title.slice(0, -BRAND_SUFFIX.length);
  if (meta.title.startsWith(BRAND_PREFIX)) return meta.title.slice(BRAND_PREFIX.length);
  return meta.title;
}

/**
 * What a visitor without JavaScript reads: the heading, the description and plain links to the public pages. Crawlers
 * render JavaScript, so this is for the rest, and for finding the links. `links` are the pages to list (name and path).
 */
export function renderNoscript(meta: RouteMeta, links: readonly RouteCrumb[]): string {
  const items = links.map((link) => `<li><a href="${escapeHtml(link.path)}">${escapeHtml(link.name)}</a></li>`).join('');
  const list = items ? `<nav aria-label="Páginas do site"><ul>${items}</ul></nav>` : '';
  return `<noscript><h1>${escapeHtml(topicOf(meta))}</h1><p>${escapeHtml(meta.description)}</p>${list}</noscript>`;
}

/** Puts a block at the end of the body, after the root and the script. Fails loudly when the template has no body end. */
export function applyNoscriptToTemplate(template: string, noscript: string): string {
  const end = template.lastIndexOf(BODY_END);
  if (end === -1) throw new Error(`the template has no ${BODY_END}`);
  return `${template.slice(0, end)}  ${noscript}\n  ${template.slice(end)}`;
}
