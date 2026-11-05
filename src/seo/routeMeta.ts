import { normalizePath, PAGE_METAS } from './pageMeta';
import { PROJECT_METAS } from './projectMeta';

// One source for what the head says about each public route. Pure data, no React. The build step (batch R) reads this
// module for the static HTML and the sitemap, and the tests read it for the whole list.
//
// The SEO component does NOT import this module: it would pull the project data into the critical path of every page.
// It loads pageMeta.ts (the home and the inner pages), and the page of a project hands it the meta from projectMeta.ts.

export type RouteKind = 'home' | 'page' | 'project' | 'legal';

export interface RouteImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface RouteCrumb {
  readonly name: string;
  readonly path: string;
}

export interface RouteMeta {
  /** '/', '/servicos', '/projetos/dizpara': no trailing slash, except the home. */
  readonly path: string;
  readonly kind: RouteKind;
  /** The whole <title>, brand included. */
  readonly title: string;
  readonly description: string;
  /** False: noindex, no canonical, no og:url, left out of the sitemap. */
  readonly isIndexable: boolean;
  /** YYYY-MM-DD. The date of the last real change of the page content: edit it in the same commit as the content. */
  readonly lastmod: string;
  /** Absent: the default banner of the site. */
  readonly image?: RouteImage;
  /** Empty on the home. Home and the route itself on inner routes. */
  readonly crumbs: readonly RouteCrumb[];
  /** Only where the FAQ is visible on the page. */
  readonly hasFaq?: boolean;
}

export const ROUTE_METAS: readonly RouteMeta[] = [...PAGE_METAS, ...PROJECT_METAS];

const ROUTE_BY_PATH: ReadonlyMap<string, RouteMeta> = new Map(ROUTE_METAS.map((meta) => [meta.path, meta]));

/** The meta of a path. A trailing slash, a query string and a hash do not matter. A path the site does not serve gives undefined. */
export function routeMetaFor(path: string): RouteMeta | undefined {
  return ROUTE_BY_PATH.get(normalizePath(path));
}
